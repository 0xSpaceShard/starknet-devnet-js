import * as starknet from "starknet";
import { DevnetProvider } from "..";
import * as ethers from "ethers";
import { expect } from "chai";
import { expectHexEquality, getContractArtifact, getPredeployedAccount } from "./util";

const HEX_REGEX = /^0x[0-9A-Fa-f]+/;

/** Postman is the named of Starknet's L1-L2 messaging utility. */
describe("Postman", function () {
    this.timeout(60_000); // ms

    /** Assumes there is a running Devnet instance. */
    const devnetProvider = new DevnetProvider();
    const l2Provider = new starknet.RpcProvider({ nodeUrl: devnetProvider.url });

    /**
     * Assumes a running L1 provider, e.g. anvil: https://github.com/foundry-rs/foundry/tree/master/crates/anvil
     * Using the default host and port.
     */
    const L1_URL = "http://127.0.0.1:8545";
    const l1Provider = new ethers.JsonRpcProvider(L1_URL);

    const user = 1n;

    let l2Account: starknet.Account;
    let l2Contract: starknet.Contract;
    /** Address of deployed mock Starknet messaging contract on L1. */
    let messagingContractAddress: string;
    let l1L2Example: ethers.Contract;

    before(async function () {
        await devnetProvider.restart();

        // Load the messaging contract needed for L1-L2 communication. By omitting the contract
        // address, we let Devnet deploy it and return one for us. A custom messaging contract
        // can be deployed and its address provided to the loading function, as witnessed in a
        // later test. The contract sources can be found in the same directory as the artifacts.
        const messagingLoadResponse = await devnetProvider.postman.loadL1MessagingContract(
            L1_URL,
            // If specifying a custom `deployer_account_private_key`, set `address` to null
        );
        messagingContractAddress = messagingLoadResponse.messaging_contract_address;

        // First deploy the L2 contract.
        l2Account = await getPredeployedAccount(devnetProvider, l2Provider);
        const l2Sierra = getContractArtifact("test/data/l1_l2.sierra");
        const l2ContractDeployment = await l2Account.declareAndDeploy({
            contract: l2Sierra,
            compiledClassHash: "0x02548c46a426421b5156ebbdd9a1ee0a32ec4588af5c9a68d636725cfa11d300",
        });
        l2Contract = new starknet.Contract(
            l2Sierra.abi,
            l2ContractDeployment.deploy.contract_address,
            l2Provider,
        );
        l2Contract.connect(l2Account);

        // Deploy the L1 contract. It needs to know the messaging contract's address.
        const l1Signers = await l1Provider.listAccounts();
        const l1Signer = l1Signers[0];

        const l1L2ExampleArtifact = getContractArtifact("test/data/L1L2Example.json");
        const l1L2ExampleFactory = new ethers.ContractFactory(
            l1L2ExampleArtifact.abi,
            l1L2ExampleArtifact.bytecode,
            l1Signer,
        );
        l1L2Example = (await l1L2ExampleFactory.deploy(
            messagingContractAddress,
        )) as ethers.Contract;
        await l1L2Example.waitForDeployment();
    });

    /**
     * Deploy a custom messaging contract if you need to, otherwise letting Devnet deploy one for
     * you is enough, as done in the before() hook.
     */
    it("should deploy a custom messaging contract", async () => {
        const l1Signer = (await l1Provider.listAccounts())[0];
        const messagingArtifact = getContractArtifact("test/data/MockStarknetMessaging.json");

        const messagingFactory = new ethers.ContractFactory(
            messagingArtifact.abi,
            messagingArtifact.bytecode,
            l1Signer,
        );

        const ctorArg = 5 * 60; // messasge cancellation delay in seconds
        const messagingContract = (await messagingFactory.deploy(ctorArg)) as ethers.Contract;
        await messagingContract.waitForDeployment();
        const deploymentAddress = await messagingContract.getAddress();

        const { messaging_contract_address: loadedAddress } =
            await devnetProvider.postman.loadL1MessagingContract(L1_URL, deploymentAddress);

        expectHexEquality(loadedAddress, deploymentAddress);
    });

    /** This is also done in before(), but showcased separately here. */
    it("should load the already deployed contract if the address is provided", async () => {
        const { messaging_contract_address: loadedFrom } =
            await devnetProvider.postman.loadL1MessagingContract(L1_URL, messagingContractAddress);

        expectHexEquality(loadedFrom, messagingContractAddress);
    });

    it("should exchange messages between L1 and L2", async () => {
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
        const flushL2Response = await devnetProvider.postman.flush();
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
        const flushL1Response = await devnetProvider.postman.flush();
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
        const depositAmount = 1n;
        const { transaction_hash } = await devnetProvider.postman.sendMessageToL2(
            l2Contract.address,
            starknet.selector.getSelector("deposit"),
            messagingContractAddress,
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

        // create balance on L2, withdraw a part of it
        const incrementAmount = 10_000_000n;
        await l2Contract.increase_balance(user, incrementAmount);

        const withdrawAmount = 10n;
        const withdrawTx = await l2Contract.withdraw(
            user,
            withdrawAmount,
            messagingContractAddress,
        );
        await l2Provider.waitForTransaction(withdrawTx.transaction_hash);

        const { message_hash } = await devnetProvider.postman.consumeMessageFromL2(
            l2Contract.address,
            messagingContractAddress,
            [0, user, withdrawAmount],
        );
        expect(message_hash).to.match(HEX_REGEX);

        expect(await l2Contract.get_balance(user)).to.equal(
            initialBalance + incrementAmount - withdrawAmount,
        );
    });
});
