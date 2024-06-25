import * as starknet from "starknet";
import { DevnetClient } from "../src/devnet-client";
import * as ethers from "ethers";
import { expect } from "chai";
import { expectHexEquality, getContractArtifact } from "./util";

describe("Postman", function () {
    this.timeout(60_000); // ms

    const devnetClient = new DevnetClient();
    const l2Provider = new starknet.RpcProvider({ nodeUrl: devnetClient.url });
    const L1_URL = "http://127.0.0.1:8545";
    const l1Provider = new ethers.JsonRpcProvider(L1_URL);

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
        const l2ContractDeployment = await l2Account.declareAndDeploy(
            {
                contract: l2Sierra,
                casm: getContractArtifact("test/data/cairo_1_l1l2.casm"),
            },
            {
                maxFee: 1e18,
            },
        );
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

        expect(deployedTo).to.match(/^0x[0-9a-fA-F]+/);
    });

    it("should load the already deployed contract if the address is provided", async () => {
        const messagingAddress = await mockStarknetMessaging.getAddress();
        const { messaging_contract_address: loadedFrom } =
            await devnetClient.postman.loadL1MessagingContract(L1_URL, messagingAddress);

        expectHexEquality(loadedFrom, messagingAddress);
    });

    // it("should exchange messages between L1 and L2", async () => {
    //     // Load the mock messaging contract
    //     await devnetClient.postman.loadL1MessagingContract(L1_URL, mockStarknetMessaging.address);

    //     // Increase the L2 contract balance to 100 and withdraw 10 from it.
    //     l2Contract.increase_balance([user, 100]));
    //     await l2Account.invoke(l2contract, "increase_balance", {
    //         user,
    //         amount: 100,
    //     });
    //     await l2Account.invoke(l2contract, "withdraw", {
    //         user,
    //         amount: 10,
    //         L1_CONTRACT_ADDRESS: BigInt(l1l2Example.address),
    //     });
    //     let userL2Balance = await l2contract.call("get_balance", {
    //         user,
    //     });

    //     expect(userL2Balance).to.deep.equal({ balance: 90n });

    //     /**
    //      * Flushing the L2 messages so that they can be consumed by the L1.
    //      */

    //     const flushL2Response = await starknet.devnet.flush();
    //     expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    //     const flushL2Messages = flushL2Response.consumed_messages.from_l2;

    //     expect(flushL2Messages).to.have.a.lengthOf(1);
    //     expectAddressEquality(flushL2Messages[0].from_address, l2contract.address);
    //     expectAddressEquality(flushL2Messages[0].to_address, l1l2Example.address);

    //     /**
    //      * Check the L1 balance and withdraw 10 which will consume the L2 message.
    //      */

    //     let userL1Balance: BigNumber = await l1l2Example.userBalances(user);

    //     expect(userL1Balance.eq(0)).to.be.true;

    //     await l1l2Example.withdraw(l2contract.address, user, 10);
    //     userL1Balance = await l1l2Example.userBalances(user);

    //     expect(userL1Balance.eq(10)).to.be.true;

    //     /**
    //      * Deposit to the L2 contract, L1 balance should be decreased by 2.
    //      */

    //     await l1l2Example.deposit(l2contract.address, user, 2, {
    //         value: 1, // Sets paid_fee_on_l1
    //     });

    //     userL1Balance = await l1l2Example.userBalances(user);

    //     expect(userL1Balance.eq(8)).to.be.true;

    //     /**
    //      * Check if L2 balance increased after the deposit
    //      */

    //     userL2Balance = await l2contract.call("get_balance", {
    //         user,
    //     });

    //     expect(userL2Balance).to.deep.equal({ balance: 90n });

    //     /**
    //      * Flushing the L1 messages so that they can be consumed by the L2.
    //      */

    //     const flushL1Response = await starknet.devnet.flush();
    //     const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    //     expect(flushL1Messages).to.have.a.lengthOf(1);
    //     expect(flushL1Response.consumed_messages.from_l2).to.be.empty;

    //     expectAddressEquality(flushL1Messages[0].args.from_address, l1l2Example.address);
    //     expectAddressEquality(flushL1Messages[0].args.to_address, l2contract.address);
    //     expectAddressEquality(flushL1Messages[0].address, mockStarknetMessaging.address);

    //     userL2Balance = await l2contract.call("get_balance", {
    //         user,
    //     });

    //     expect(userL2Balance).to.deep.equal({ balance: 92n });
    // });

    // it("should mock l1 to l2 tx and vice versa", async () => {
    //     const L1_CONTRACT_ADDRESS = mockStarknetMessaging.address;
    //     const { transaction_hash } = await starknet.devnet.sendMessageToL2(
    //         l2contract.address,
    //         "deposit",
    //         L1_CONTRACT_ADDRESS,
    //         [1, 1],
    //         0,
    //         1, // Paid fee on l1
    //     );

    //     expect(transaction_hash.startsWith("0x")).to.be.true;
    //     const tx = await starknet.getTransaction(transaction_hash);
    //     expect(tx.status).to.be.oneOf(OK_TX_STATUSES);
    //     await l2Account.invoke(l2contract, "increase_balance", {
    //         user,
    //         amount: 10000000,
    //     });

    //     await l2Account.invoke(l2contract, "withdraw", {
    //         user,
    //         amount: 10,
    //         L1_CONTRACT_ADDRESS,
    //     });

    //     const { message_hash } = await starknet.devnet.consumeMessageFromL2(
    //         l2contract.address,
    //         L1_CONTRACT_ADDRESS,
    //         [0, 1, 10],
    //     );
    //     expect(message_hash.startsWith("0x")).to.be.true;
    // });

    // it("should estimate message fee", async () => {
    //     const L1_CONTRACT_ADDRESS = mockStarknetMessaging.address;
    //     const estimatedMessageFee = await l2contract.estimateMessageFee("deposit", {
    //         from_address: L1_CONTRACT_ADDRESS,
    //         amount: 123,
    //         user,
    //     });
    //     expectFeeEstimationStructure(estimatedMessageFee);
    // });

    // it("should fail to estimate message fee with a non @l1_handler function", async () => {
    //     try {
    //         const L1_CONTRACT_ADDRESS = mockStarknetMessaging.address;
    //         await l2contract.estimateMessageFee("withdraw", {
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
});
