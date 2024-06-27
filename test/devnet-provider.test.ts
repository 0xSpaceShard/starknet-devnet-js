import { expect, assert } from "chai";
import { DevnetProvider, BalanceUnit, MintResponse } from "../src/devnet-provider";
import * as starknet from "starknet";

describe("DevnetProvider", function () {
    const devnetProvider = new DevnetProvider();
    const starknetProvider = new starknet.RpcProvider({ nodeUrl: devnetProvider.url });

    beforeEach("restart the state", async function () {
        await devnetProvider.restart();
    });

    it("should have a healthcheck endpoint", async function () {
        const isAlive = await devnetProvider.isAlive();
        expect(isAlive).to.be.true;
    });

    it("should have predeployed accounts", async function () {
        const accounts = await devnetProvider.getPredeployedAccounts();
        expect(accounts).length.to.be.greaterThan(0);
    });

    function assertMintResp(resp: MintResponse, expectedAmount: number, expectedUnit: BalanceUnit) {
        expect(resp.tx_hash).to.match(/^0x[0-9a-fA-F]+/);
        expect(resp.new_balance).to.equal(BigInt(expectedAmount));
        expect(resp.unit).to.equal(expectedUnit);
    }

    describe("minting", function () {
        const DUMMY_ADDRESS = "0x1";
        const DUMMY_AMOUNT = 20;

        it("works for WEI", async function () {
            const mintResp = await devnetProvider.mint(DUMMY_ADDRESS, DUMMY_AMOUNT, "WEI");
            assertMintResp(mintResp, DUMMY_AMOUNT, "WEI");
        });

        it("works for FRI", async function () {
            const mintResp = await devnetProvider.mint(DUMMY_ADDRESS, DUMMY_AMOUNT, "FRI");
            assertMintResp(mintResp, DUMMY_AMOUNT, "FRI");
        });

        it("works without specifying the unit", async function () {
            const mintResp = await devnetProvider.mint(DUMMY_ADDRESS, DUMMY_AMOUNT);
            assertMintResp(mintResp, DUMMY_AMOUNT, "WEI");
        });
    });

    describe("block manipulation", function () {
        it("should create new block", async function () {
            const originalLatestBlock = await starknetProvider.getBlockLatestAccepted();

            const { block_hash: createdBlockHash } = await devnetProvider.createBlock();

            const newLatestBlock = await starknetProvider.getBlockLatestAccepted();
            expect(newLatestBlock).to.deep.equal({
                block_hash: createdBlockHash,
                block_number: originalLatestBlock.block_number + 1,
            });
        });

        it("should abort blocks", async function () {
            const originalLatestBlock = await starknetProvider.getBlockLatestAccepted();

            const { block_hash: createdBlockHash1 } = await devnetProvider.createBlock();
            const { block_hash: createdBlockHash2 } = await devnetProvider.createBlock();

            const { aborted } = await devnetProvider.abortBlocks(createdBlockHash1);
            expect(aborted).to.deep.equal([createdBlockHash2, createdBlockHash1]);

            const newLatestBlock = await starknetProvider.getBlockLatestAccepted();
            expect(newLatestBlock).to.deep.equal(originalLatestBlock);
        });

        it("should fail when aborting non-existent blocks", async function () {
            const nonExistentBlockHash = "0x42";
            try {
                const resp = await devnetProvider.abortBlocks(nonExistentBlockHash);
                assert.fail(`Should have failed but got: ${resp}`);
            } catch (err) {
                expect(err).to.deep.equal({
                    code: -1,
                    message: "Block abortion failed: No block found",
                });
            }
        });
    });

    describe("time manipulation", function () {
        it("should set time after manually generating a block", async function () {
            const originalBlock = await starknetProvider.getBlock("latest");

            const futureTime = originalBlock.timestamp * 2;
            const { block_hash: blockHash } = await devnetProvider.setTime(futureTime);

            // since block generation was not requested as part of time setting
            expect(blockHash).to.be.null;

            const { block_hash: newBlockHash } = await devnetProvider.createBlock();
            const newBlock = await starknetProvider.getBlockWithTxHashes(newBlockHash);
            expect(newBlock.timestamp).to.equal(futureTime);
        });

        it("should generate a block and set time in one request", async function () {
            const originalBlock = await starknetProvider.getBlock("latest");

            const futureTime = originalBlock.timestamp * 2;
            const { block_hash: blockHash } = await devnetProvider.setTime(futureTime, true);

            const newBlock = await starknetProvider.getBlock("latest");
            expect(newBlock.block_hash).to.equal(blockHash);
            expect(newBlock.timestamp).to.equal(futureTime);
        });

        it("should increase time", async function () {
            const originalBlock = await starknetProvider.getBlock("latest");

            const timeIncrement = 100;
            const { block_hash: newBlockHash } = await devnetProvider.increaseTime(timeIncrement);

            const newBlock = await starknetProvider.getBlock("latest");
            expect(newBlock.block_hash).to.equal(newBlockHash);
            expect(newBlock.timestamp).to.be.equal(originalBlock.timestamp + timeIncrement);
        });
    });
});
