import { expect, assert } from "chai";
import * as starknet from "starknet";
import { Devnet } from "..";
import {
    expectHexEquality,
    getContractArtifact,
    getEnvVar,
    getPredeployedAccount,
    toPrefixedHex,
} from "./util";
import {
    SIMPLE_CONTRACT_SIERRA_HASH,
    SIMPLE_CONTRACT_PATH,
    SIMPLE_CONTRACT_CASM_HASH,
} from "./constants";

describe.only("Gas price modification", function () {
    this.timeout(10_000); // ms

    async function expectInsufficientResourceDeclaration(
        account: starknet.Account,
        contract: starknet.CompiledContract,
        compiledClassHash: string,
        txConfig: starknet.UniversalDetails,
    ) {
        try {
            await account.declare({ contract, compiledClassHash }, txConfig);
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
        assert.fail("TODO");
    });

    it("should sequentially lower the prices and allow tx execution after block creation", async function () {
        // Set up Devnet with custom gas prices
        const l1GasPrice = 1000n;
        const l1DataGasPrice = 10n;
        const l2GasPrice = 10n;
        const devnet = await Devnet.spawnCommand(getEnvVar("DEVNET_PATH"), {
            args: [
                "--gas-price-fri",
                l1GasPrice.toString(),
                "--data-gas-price-fri",
                l1DataGasPrice.toString(),
                "--l2-gas-price-fri",
                l2GasPrice.toString(),
            ],
        });
        const starknetProvider = new starknet.RpcProvider({ nodeUrl: devnet.provider.url });

        // Things needed for tx sending; l1_data_gas and l2_gas are delibaretly too low
        const account = await getPredeployedAccount(devnet.provider, starknetProvider);
        const contractArtifact = getContractArtifact(SIMPLE_CONTRACT_PATH);
        const compiledClassHash = SIMPLE_CONTRACT_CASM_HASH;
        const txConfig = {
            resourceBounds: {
                l1_gas: {
                    max_amount: "0x0",
                    max_price_per_unit: toPrefixedHex(l1GasPrice),
                },
                l1_data_gas: {
                    max_amount: toPrefixedHex(1000n),
                    max_price_per_unit: toPrefixedHex(l1DataGasPrice - 1n),
                },
                l2_gas: {
                    max_amount: toPrefixedHex(BigInt(1e19)),
                    max_price_per_unit: toPrefixedHex(l2GasPrice - 1n),
                },
            },
        };

        await expectInsufficientResourceDeclaration(
            account,
            contractArtifact,
            compiledClassHash,
            txConfig,
        );

        // lower l1_data_gas price; still expect failure
        let modifiedPrices = await devnet.provider.setGasPrice({ l1DataGasPrice });
        await expectInsufficientResourceDeclaration(
            account,
            contractArtifact,
            compiledClassHash,
            txConfig,
        );
        expect(modifiedPrices.l1_data_gas_price).to.equal(l1DataGasPrice);

        // lower l2_gas price; still expect failure
        modifiedPrices = await devnet.provider.setGasPrice({ l2GasPrice });
        await expectInsufficientResourceDeclaration(
            account,
            contractArtifact,
            compiledClassHash,
            txConfig,
        );
        expect(modifiedPrices.l1_data_gas_price).to.equal(l1DataGasPrice);
        expect(modifiedPrices.l2_gas_price).to.equal(l2GasPrice);

        // assert successful declaration after gas prices are actually changed
        await devnet.provider.createBlock();
        const declaration = await account.declare(
            { contract: contractArtifact, compiledClassHash },
            txConfig,
        );
        expectHexEquality(declaration.class_hash, SIMPLE_CONTRACT_SIERRA_HASH);
    });
});
