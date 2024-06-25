import * as starknet from "starknet";
import { DevnetClient } from "../src/devnet-client";
import * as ethers from "ethers";
import { expect } from "chai";
import { expectHexEquality, getContractArtifact } from "./util";

const HEX_REGEX = /^0x[0-9A-Fa-f]+/;

describe("Postman", function () {
    this.timeout(60_000); // ms

    const devnetClient = new DevnetClient();
    const l2Provider = new starknet.RpcProvider({ nodeUrl: devnetClient.url });
    const L1_URL = "http://127.0.0.1:8545";
    const l1Provider = new ethers.JsonRpcProvider(L1_URL);

    const user = 1n;

    let l2Account: starknet.Account;
    let l2Contract: starknet.Contract;
    let mockStarknetMessaging: ethers.Contract;
    let l1L2Example: ethers.Contract;

    async function getPredeployedL2Account() {
        const predeployedAccountData = (await devnetClient.getPredeployedAccounts())[0];

        return new starknet.Account(
            l2Provider,
            predeployedAccountData.address,
            predeployedAccountData.private_key,
        );
    }

    before(async function () {
        l2Account = await getPredeployedL2Account();

        const l2Sierra = getContractArtifact("test/data/cairo_1_l1l2.sierra");
        const l2ContractDeployment = await l2Account.declareAndDeploy({
            contract: l2Sierra,
            casm: getContractArtifact("test/data/cairo_1_l1l2.casm"),
        });
        l2Contract = new starknet.Contract(
            l2Sierra.abi,
            l2ContractDeployment.deploy.contract_address,
            l2Provider,
        );
        l2Contract.connect(l2Account);

        const l1Signers = await l1Provider.listAccounts();
        const l1Signer = l1Signers[0];

        const mockStarknetMessagingArtifact = getContractArtifact(
            "test/data/MockStarknetMessaging.json",
        );

        const mockStarknetMessagingFactory = new ethers.ContractFactory(
            mockStarknetMessagingArtifact.abi,
            mockStarknetMessagingArtifact.bytecode,
            l1Signer,
        );

        const messageCancellationDelay = 5 * 60; // ctor arg: seconds
        mockStarknetMessaging = (await mockStarknetMessagingFactory.deploy(
            messageCancellationDelay,
        )) as ethers.Contract;
        await mockStarknetMessaging.waitForDeployment();

        const l1L2ExampleArtifact = getContractArtifact("test/data/L1L2Example.json");
        const l1L2ExampleFactory = new ethers.ContractFactory(
            l1L2ExampleArtifact.abi,
            l1L2ExampleArtifact.bytecode,
            l1Signer,
        );
        l1L2Example = (await l1L2ExampleFactory.deploy(
            await mockStarknetMessaging.getAddress(),
        )) as ethers.Contract;
        await l1L2Example.waitForDeployment();
    });

    it("should deploy the messaging contract", async () => {
        const { messaging_contract_address: deployedTo } =
            await devnetClient.postman.loadL1MessagingContract(L1_URL);

        expect(deployedTo).to.match(HEX_REGEX);
    });

    it("should load the already deployed contract if the address is provided", async () => {
        const messagingAddress = await mockStarknetMessaging.getAddress();
        const { messaging_contract_address: loadedFrom } =
            await devnetClient.postman.loadL1MessagingContract(L1_URL, messagingAddress);

        expectHexEquality(loadedFrom, messagingAddress);
    });

    it("should exchange messages between L1 and L2", async () => {
        // Load the mock messaging contract.
        const messagingAddress = await mockStarknetMessaging.getAddress();
        await devnetClient.postman.loadL1MessagingContract(L1_URL, messagingAddress);

        // Increase the L2 contract balance to 100 and withdraw 10 from it.
        await l2Provider.waitForTransaction(
            (await l2Contract.increase_balance(user, 100)).transaction_hash,
        );
        const l1L2ExampleAddress = await l1L2Example.getAddress();
        await l2Provider.waitForTransaction(
            (await l2Contract.withdraw(user, 10, l1L2ExampleAddress)).transaction_hash,
        );

        expect(await l2Contract.get_balance(user)).to.equal(90n);

        // Flushing the L2 messages so that they can be consumed by the L1.
        const flushL2Response = await devnetClient.postman.flush();
        expect(flushL2Response.messages_to_l2).to.be.empty;
        const flushL2Messages = flushL2Response.messages_to_l1;

        expect(flushL2Messages).to.have.a.lengthOf(1);
        expectHexEquality(flushL2Messages[0].from_address, l2Contract.address);
        expectHexEquality(flushL2Messages[0].to_address, l1L2ExampleAddress);

        // Check the L1 balance and withdraw 10 which will consume the L2 message.
        expect(await l1L2Example.userBalances(user)).to.equal(0n);
        await l1L2Example.withdraw(l2Contract.address, user, 10);
        expect(await l1L2Example.userBalances(user)).to.equal(10n);

        // Deposit to the L2 contract, L1 balance should be decreased by 2.
        const depositAmount = 2n;
        const l1Fee = 1n; // Sets paid_fee_on_l1
        await l1L2Example.deposit(l2Contract.address, user, depositAmount, {
            value: l1Fee,
        });
        expect(await l1L2Example.userBalances(user)).to.equal(8n);

        // Check if L2 balance increased after the deposit
        expect(await l2Contract.get_balance(user)).to.equal(90n);

        // Flushing the L1 messages so that they can be consumed by the L2.
        const flushL1Response = await devnetClient.postman.flush();
        const flushL1Messages = flushL1Response.messages_to_l2;
        expect(flushL1Messages).to.have.a.lengthOf(1);
        expect(flushL1Response.messages_to_l1).to.be.empty;

        expectHexEquality(flushL1Messages[0].l1_contract_address, l1L2ExampleAddress);
        expectHexEquality(flushL1Messages[0].l2_contract_address, l2Contract.address);
        expect(BigInt(flushL1Messages[0].paid_fee_on_l1)).to.equal(l1Fee);
        expect(flushL1Messages[0].nonce).to.match(HEX_REGEX);
        expect(flushL1Messages[0].payload.map(BigInt)).to.deep.equal([user, depositAmount]);

        expect(await l2Contract.get_balance(user)).to.equal(92n);
    });

    // it("should mock l1 to l2 tx and vice versa", async () => {
    //     const L1_CONTRACT_ADDRESS = mockStarknetMessaging.address;
    //     const { transaction_hash } = await starknet.devnet.sendMessageToL2(
    //         l2Contract.address,
    //         "deposit",
    //         L1_CONTRACT_ADDRESS,
    //         [1, 1],
    //         0,
    //         1, // Paid fee on l1
    //     );

    //     expect(transaction_hash.startsWith("0x")).to.be.true;
    //     const tx = await starknet.getTransaction(transaction_hash);
    //     expect(tx.status).to.be.oneOf(OK_TX_STATUSES);
    //     await l2Account.invoke(l2Contract, "increase_balance", {
    //         user,
    //         amount: 10000000,
    //     });

    //     await l2Account.invoke(l2Contract, "withdraw", {
    //         user,
    //         amount: 10,
    //         L1_CONTRACT_ADDRESS,
    //     });

    //     const { message_hash } = await starknet.devnet.consumeMessageFromL2(
    //         l2Contract.address,
    //         L1_CONTRACT_ADDRESS,
    //         [0, 1, 10],
    //     );
    //     expect(message_hash.startsWith("0x")).to.be.true;
    // });

    // it("should estimate message fee", async () => {
    //     const L1_CONTRACT_ADDRESS = mockStarknetMessaging.address;
    //     const estimatedMessageFee = await l2Contract.estimateMessageFee("deposit", {
    //         from_address: L1_CONTRACT_ADDRESS,
    //         amount: 123,
    //         user,
    //     });
    //     expectFeeEstimationStructure(estimatedMessageFee);
    // });

    // it("should fail to estimate message fee with a non @l1_handler function", async () => {
    //     try {
    //         const L1_CONTRACT_ADDRESS = mockStarknetMessaging.address;
    //         await l2Contract.estimateMessageFee("withdraw", {
    //             from_address: L1_CONTRACT_ADDRESS,
    //             amount: 123,
    //             user,
    //         });
    //         expect.fail("Should have failed on the previous line");
    //     } catch (err) {
    //         expectStarknetPluginErrorContain(
    //             err,
    //             'Cannot estimate message fee on "withdraw" - not an @l1_handler',
    //         );
    //     }
    // });

    // it("should estimate message fee", )
});
