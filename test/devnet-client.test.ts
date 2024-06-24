import { expect } from "chai";
import { DevnetClient, BalanceUnit, MintResponse } from "../src/devnet-client";

describe("DevnetClient", function () {
    const devnetClient = new DevnetClient();
    beforeEach("restart the state", async function () {
        await devnetClient.restart();
    });

    it("should have a healthcheck endpoint", async function () {
        const devnetClient = new DevnetClient();
        const isAlive = await devnetClient.isAlive();
        expect(isAlive).to.be.true;
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
            const devnetClient = new DevnetClient();
            const mintResp = await devnetClient.mint(DUMMY_ADDRESS, DUMMY_AMOUNT, "WEI");
            assertMintResp(mintResp, DUMMY_AMOUNT, "WEI");
        });

        it("works for FRI", async function () {
            const devnetClient = new DevnetClient();
            const mintResp = await devnetClient.mint(DUMMY_ADDRESS, DUMMY_AMOUNT, "FRI");
            assertMintResp(mintResp, DUMMY_AMOUNT, "FRI");
        });

        it("works without specifying the unit", async function () {
            const devnetClient = new DevnetClient();
            const mintResp = await devnetClient.mint(DUMMY_ADDRESS, DUMMY_AMOUNT);
            assertMintResp(mintResp, DUMMY_AMOUNT, "WEI");
        });
    });
});
