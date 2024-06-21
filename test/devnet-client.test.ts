import { expect } from "chai";
import { DevnetClient, BalanceUnit } from "../src/devnet-client";

describe("DevnetClient", function () {
    it("should have a healthcheck endpoint", async function () {
        const devnetClient = new DevnetClient();
        const isAlive = await devnetClient.isAlive();
        expect(isAlive).to.be.true;
    });

    it("can mint", async function () {
        const devnetClient = new DevnetClient();
        const dummyAddress = "0x1";
        const dummyAmount = 20n;
        for (const unit of ["WEI" as BalanceUnit, "FRI" as BalanceUnit]) {
            const mintRespData = await devnetClient.mint(dummyAddress, dummyAmount, unit);
            expect(mintRespData.tx_hash).to.match(/^0x[0-9a-fA-F]+/);
            expect(mintRespData.new_balance).to.equal(dummyAmount);
            expect(mintRespData.unit).to.equal(unit);
        }

        const defaultUnitMintRespData = await devnetClient.mint(dummyAddress, dummyAmount);
        expect(defaultUnitMintRespData.tx_hash).to.match(/^0x[0-9a-fA-F]+/);
        expect(defaultUnitMintRespData.new_balance).to.equal(dummyAmount);
        expect(defaultUnitMintRespData.unit).to.equal("WEI");
    });
});
