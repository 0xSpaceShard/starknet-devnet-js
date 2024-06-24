import { expect } from "chai";
import { DevnetClient, BalanceUnit, MintResponse } from "../src/devnet-client";

describe("DevnetClient", function () {
    it("should have a healthcheck endpoint", async function () {
        const devnetClient = new DevnetClient();
        const isAlive = await devnetClient.isAlive();
        expect(isAlive).to.be.true;
    });

    function assertMintResp(resp: MintResponse, expectedAmount: bigint, expectedUnit: BalanceUnit) {
        expect(resp.tx_hash).to.match(/^0x[0-9a-fA-F]+/);
        expect(resp.new_balance).to.equal(expectedAmount);
        expect(resp.unit).to.equal(expectedUnit);
    }

    describe("minting", function () {
        const DUMMY_ADDRESS = "0x1";
        const DUMMY_AMOUNT = 20n;

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
