import * as starknet from "starknet";
import { DevnetClient } from "../src/devnet-client";
import * as ethers from "ethers";
import { expect } from "chai";
import { expectHexEquality, getContractArtifact } from "./util";

const HEX_REGEX = /^0x[0-9A-Fa-f]+/;

describe("Postman", function () {
    this.timeout(60_000); // ms

    /** Assumes there is a running Devnet instance. */
    const devnetClient = new DevnetClient();
    const l2Provider = new starknet.RpcProvider({ nodeUrl: devnetClient.url });

    const L1_URL = "http://127.0.0.1:8545";
    /** Assumes there is an L1 provider, e.g. anvil:
     * https://github.com/foundry-rs/foundry/tree/master/crates/anvil
     */
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
        await devnetClient.restart();
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

        // Deposit to the L2 contract, L1 balance should be decreased and L2 balance increased by 2.
        const depositAmount = 2n;
        const l1Fee = 1n;
        await l1L2Example.deposit(l2Contract.address, user, depositAmount, {
            value: l1Fee,
        });
        expect(await l1L2Example.userBalances(user)).to.equal(8n);
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
        expect(flushL1Messages[0].entry_point_selector).to.equal(
            starknet.selector.getSelector("deposit"),
        );
        expect(flushL1Messages[0].payload.map(BigInt)).to.deep.equal([user, depositAmount]);

        expect(await l2Contract.get_balance(user)).to.equal(92n);
    });

    it("should mock messaging from L1 to L2", async () => {
        const initialBalance = await l2Contract.get_balance(user);
        const l1Address = await mockStarknetMessaging.getAddress();
        const depositAmount = 1n;
        const { transaction_hash } = await devnetClient.postman.sendMessageToL2(
            l2Contract.address,
            starknet.selector.getSelector("deposit"),
            l1Address,
            [user, depositAmount],
            0, // nonce
            1, // paid fee on l1
        );
        expect(transaction_hash).to.match(HEX_REGEX);

        const tx = await l2Provider.getTransactionReceipt(transaction_hash);
        expect(tx.isSuccess()).to.be.true;

        expect(await l2Contract.get_balance(user)).to.equal(initialBalance + depositAmount);
    });

    it("should mock messaging from L2 to L1", async () => {
        const initialBalance = await l2Contract.get_balance(user);
        const l1Address = await mockStarknetMessaging.getAddress();

        // create balance on L2, withdraw a part of it
        const incrementAmount = 10000000n;
        await l2Contract.increase_balance(user, incrementAmount);

        const withdrawAmount = 10n;
        await l2Provider.waitForTransaction(
            (await l2Contract.withdraw(user, withdrawAmount, l1Address)).transaction_hash,
        );

        const { message_hash } = await devnetClient.postman.consumeMessageFromL2(
            l2Contract.address,
            l1Address,
            [0, user, withdrawAmount],
        );
        expect(message_hash).to.match(HEX_REGEX);

        expect(await l2Contract.get_balance(user)).to.equal(
            initialBalance + incrementAmount - withdrawAmount,
        );
    });
});
