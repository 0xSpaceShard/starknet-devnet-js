import { expect } from "chai";
import { DevnetProvider, BalanceUnit, MintResponse } from "../src/devnet-provider";

describe("DevnetProvider", function () {
    const devnetProvider = new DevnetProvider();

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
            const devnetProvider = new DevnetProvider();
            const mintResp = await devnetProvider.mint(DUMMY_ADDRESS, DUMMY_AMOUNT, "WEI");
            assertMintResp(mintResp, DUMMY_AMOUNT, "WEI");
        });

        it("works for FRI", async function () {
            const devnetProvider = new DevnetProvider();
            const mintResp = await devnetProvider.mint(DUMMY_ADDRESS, DUMMY_AMOUNT, "FRI");
            assertMintResp(mintResp, DUMMY_AMOUNT, "FRI");
        });

        it("works without specifying the unit", async function () {
            const devnetProvider = new DevnetProvider();
            const mintResp = await devnetProvider.mint(DUMMY_ADDRESS, DUMMY_AMOUNT);
            assertMintResp(mintResp, DUMMY_AMOUNT, "WEI");
        });
    });
});
