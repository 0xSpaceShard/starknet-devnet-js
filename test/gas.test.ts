import { expect, assert } from "chai";
import * as starknet from "starknet";
import { Devnet } from "..";
import { expectHexEquality, getContractArtifact, getEnvVar, getPredeployedAccount } from "./util";
import {
    SIMPLE_CONTRACT_SIERRA_HASH,
    SIMPLE_CONTRACT_PATH,
    SIMPLE_CONTRACT_CASM_HASH,
} from "./constants";

describe("Gas price modification", function () {
    this.timeout(10_000); // ms

    // Defined in beforeEach hook
    let devnet: Devnet;
    let starknetProvider: starknet.RpcProvider;
    let account: starknet.Account;

    // Gas prices
    const initialL1GasPrice = 1000n;
    const initialL1DataGasPrice = 10n;
    const initialL2GasPrice = 10n;
    const loweredL1DataGasPrice = initialL1DataGasPrice - 1n;
    const loweredL2GasPrice = initialL2GasPrice - 1n;

    // Data used in declaration tx
    const contractArtifact = getContractArtifact(SIMPLE_CONTRACT_PATH);
    const compiledClassHash = SIMPLE_CONTRACT_CASM_HASH;
    const txConfig: starknet.UniversalDetails = {
        resourceBounds: {
            l1_gas: {
                max_amount: 0n,
                max_price_per_unit: initialL1GasPrice,
            },
            l1_data_gas: {
                max_amount: 1000n,
                max_price_per_unit: loweredL1DataGasPrice,
            },
            l2_gas: {
                max_amount: 10_000_000_000_000_000_000n,
                max_price_per_unit: loweredL2GasPrice,
            },
        },
    };

    beforeEach("Set up Devnet and account", async function () {
        devnet = await Devnet.spawnCommand(getEnvVar("DEVNET_PATH"), {
            args: [
                "--gas-price-fri",
                initialL1GasPrice.toString(),
                "--data-gas-price-fri",
                initialL1DataGasPrice.toString(),
                "--l2-gas-price-fri",
                initialL2GasPrice.toString(),
            ],
        });
        starknetProvider = new starknet.RpcProvider({ nodeUrl: devnet.provider.url });
        account = await getPredeployedAccount(devnet.provider, starknetProvider);

        await expectInsufficientResourceDeclaration(txConfig);
    });

    async function expectInsufficientResourceDeclaration(txConfig: starknet.UniversalDetails) {
        try {
            await account.declare({ contract: contractArtifact, compiledClassHash }, txConfig);
            assert.fail("Should have failed");
        } catch (err) {
            const rpcError = err as starknet.RpcError;
            expect(rpcError.baseError).to.deep.equal({
                code: 53,
                message:
                    "The transaction's resources don't cover validation or the minimal transaction fee",
            });
        }
    }

    it("should lower all prices at once and generate a new block that allows tx execution", async function () {
        // Lower the required gas prices
        const modifiedPrices = await devnet.provider.setGasPrice(
            {
                l1DataGasPrice: loweredL1DataGasPrice,
                l2GasPrice: loweredL2GasPrice,
            },
            true, // create new block with modified gas prices
        );
        expect(modifiedPrices.l1_data_gas_price).to.equal(loweredL1DataGasPrice);
        expect(modifiedPrices.l1_data_gas_price).to.equal(loweredL1DataGasPrice);

        const declaration = await account.declare(
            { contract: contractArtifact, compiledClassHash },
            txConfig,
        );
        expectHexEquality(declaration.class_hash, SIMPLE_CONTRACT_SIERRA_HASH);
    });

    it("should sequentially lower the prices and allow tx execution after block creation", async function () {
        // lower l1_data_gas price; still expect failure
        let modifiedPrices = await devnet.provider.setGasPrice({
            l1DataGasPrice: loweredL1DataGasPrice,
        });
        await expectInsufficientResourceDeclaration(txConfig);
        expect(modifiedPrices.l1_data_gas_price).to.equal(loweredL1DataGasPrice);

        // lower l2_gas price; still expect failure
        modifiedPrices = await devnet.provider.setGasPrice({ l2GasPrice: loweredL2GasPrice });
        await expectInsufficientResourceDeclaration(txConfig);
        expect(modifiedPrices.l1_data_gas_price).to.equal(loweredL1DataGasPrice);
        expect(modifiedPrices.l2_gas_price).to.equal(loweredL2GasPrice);

        // assert successful declaration after gas prices are actually changed
        await devnet.provider.createBlock();
        const declaration = await account.declare(
            { contract: contractArtifact, compiledClassHash },
            txConfig,
        );
        expectHexEquality(declaration.class_hash, SIMPLE_CONTRACT_SIERRA_HASH);
    });
});
