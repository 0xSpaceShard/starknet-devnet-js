import { expect } from "chai";
import { Devnet } from "..";
import { getEnvVar, sleep } from "./util";

describe("Devnet", function () {
    this.timeout(5000);

    let devnetPath: string;
    before(function () {
        devnetPath = getEnvVar("DEVNET_PATH");
    });

    it("should be spawnable via path and killable", async function () {
        const devnet = await Devnet.spawnCommand(devnetPath);
        expect(await devnet.provider.isAlive()).to.be.true;

        // the subprocess is killed automatically on program exit,
        // but here it is demonstrated that it can be killed on request
        const success = devnet.kill();
        expect(success).to.be.true;

        // could work without the sleep, but on slower systems it needs some time to die in peae
        await sleep(2000);

        expect(await devnet.provider.isAlive()).to.be.false;
    });

    it("should spawn multiple Devnets at different ports", async function () {
        const devnet = await Devnet.spawnCommand(devnetPath);
        const anotherDevnet = await Devnet.spawnCommand(devnetPath);

        expect(devnet.provider.url).to.not.be.equal(anotherDevnet.provider.url);

        expect(await devnet.provider.isAlive()).to.be.true;
        expect(await anotherDevnet.provider.isAlive()).to.be.true;
    });
});
