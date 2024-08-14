import { RpcProvider, Account, Contract, LibraryError, Provider } from "starknet";
import { DevnetProvider } from "..";
import { getContractArtifact, getEnvVar, getPredeployedAccount } from "./util";
import { assert, expect } from "chai";

describe("Account impersonation", function () {
    this.timeout(30_000); // ms

    /**
     * Assuming there is a Devnet instance forked from the network where the impersonated account is located.
     */
    let devnetProvider: DevnetProvider;
    let starknetProvider: Provider;

    /** An actual mainnet account. */
    let impersonatedAccount: Account;

    /** A contract used for testing account interaction with the state.*/
    let contract: Contract;

    before("set up providers and account for impersonation", function () {
        const forkedDevnetUrl = `http://localhost:${getEnvVar("FORKED_DEVNET_PORT")}`;
        devnetProvider = new DevnetProvider({ url: forkedDevnetUrl });
        starknetProvider = new RpcProvider({ nodeUrl: devnetProvider.url });

        impersonatedAccount = new Account(
            starknetProvider,
            "0x0276feffed3bf366a4305f5e32e0ccb08c2da4915d83d81127b5b9d4210a80db",
            "0x1", // dummy private key, in impersonation it is not actually used for signing
        );
    });

    before("restart the state", async function () {
        await devnetProvider.restart();

        // Test contract setup (declaration and deployment) is done here using a local account.
        // Later, the contract is interacted with using an impersonated account.
        const predeployedAccount = await getPredeployedAccount(devnetProvider, starknetProvider);

        const contractArtifact = getContractArtifact("test/data/simple.sierra");
        const contractDeployment = await predeployedAccount.declareAndDeploy({
            contract: contractArtifact,
            compiledClassHash: "0x63b33a5f2f46b1445d04c06d7832c48c48ad087ce0803b71f2b8d96353716ca",
            constructorCalldata: { initial_balance: 0 },
        });
        contract = new Contract(
            contractArtifact.abi,
            contractDeployment.deploy.contract_address,
            starknetProvider,
        );
        contract.connect(impersonatedAccount);
        // We are dealing with an actual Mainnet account and its funds might have been used up.
        await devnetProvider.mint(impersonatedAccount.address, BigInt(1e18));
    });

    async function expectValidationFailure(invocation: Promise<unknown>) {
        try {
            await invocation;
            assert.fail("Invocation should have failed");
        } catch (err) {
            const typedErr = err as LibraryError;
            expect(typedErr.message).to.contain("Account validation failed");
        }
    }

    it("should work for one account", async function () {
        const initialBalance = await contract.get_balance();
        const incrementAmount = 100n;

        // Attempt invoking a contract method - should fail since we defined the account using a dummy key.
        // The contract was connected to the account during setup.
        await expectValidationFailure(contract.increase_balance(incrementAmount, 0));

        // Configure impersonation and expect transaction success
        await devnetProvider.cheats.impersonateAccount(impersonatedAccount.address);
        const successReceipt = await starknetProvider.waitForTransaction(
            (await contract.increase_balance(incrementAmount, 0)).transaction_hash,
        );

        expect(successReceipt.isSuccess());
        expect(await contract.get_balance()).to.equal(initialBalance + incrementAmount);

        // Revoke impersonation, should fail again
        await devnetProvider.cheats.stopImpersonateAccount(impersonatedAccount.address);
        await expectValidationFailure(contract.increase_balance(incrementAmount, 0));
    });

    it("should work for any account", async function () {
        const initialBalance = await contract.get_balance();
        const incrementAmount = 100n;

        // Attempt invoking a contract method - should fail since we defined the account using a dummy key.
        // The contract was connected to the account during setup.
        await expectValidationFailure(contract.increase_balance(incrementAmount, 0));

        // Configure impersonation and expect transaction success
        await devnetProvider.cheats.autoImpersonate();
        const successReceipt = await starknetProvider.waitForTransaction(
            (await contract.increase_balance(incrementAmount, 0)).transaction_hash,
        );

        expect(successReceipt.isSuccess());
        expect(await contract.get_balance()).to.equal(initialBalance + incrementAmount);

        // Revoke impersonation, should fail again
        await devnetProvider.cheats.stopAutoImpersonate();
        await expectValidationFailure(contract.increase_balance(incrementAmount, 0));
    });
});
