import { expect } from "chai";
import { DevnetClient } from "../dist/devnet-client";

describe("Client", function () {
    it("should have a healthcheck endpoint", async function () {
        const devnetClient = new DevnetClient();
        const status = await devnetClient.isAlive();
        expect(status).to.be.true;
    });
});
