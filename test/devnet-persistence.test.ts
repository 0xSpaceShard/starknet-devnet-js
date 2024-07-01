import * as path from "path";
import * as fs from "fs";
import { DevnetProvider } from "..";
import { expect } from "chai";

describe("Devnet persistence", async function () {
    this.timeout(10_000); // ms

    const WORKDIR = "/tmp";
    const DUMP_EXTENSION = ".dump";

    const DUMMY_ADDRESS = "0x1";
    const DUMMY_AMOUNT = 20;

    const devnetProvider = new DevnetProvider();

    function removeDumps() {
        for (const fileName of fs.readdirSync(WORKDIR)) {
            if (fileName.endsWith(DUMP_EXTENSION)) {
                fs.rmSync(path.join(WORKDIR, fileName));
            }
        }
    }

    before("clear workdir and Devnet state", async function () {
        removeDumps();
        await devnetProvider.restart();
    });

    after("clear workdir", function () {
        // removeDumps();
    });

    function getRandomDumpPath() {
        const name = `persisted_devnet_${Math.random().toString().slice(2)}${DUMP_EXTENSION}`;
        return path.join(WORKDIR, name);
    }

    it("should dump and load", async function () {
        const dumpPath = getRandomDumpPath();

        async function dummyMint() {
            const { new_balance } = await devnetProvider.mint(DUMMY_ADDRESS, DUMMY_AMOUNT);
            return new_balance;
        }

        const balanceBeforeDump = await dummyMint();
        await devnetProvider.dump(dumpPath);
        console.log("DEBUG going to sleep");
        await new Promise((resolve, _) => setTimeout(resolve, 3000));
        console.log("DEBUG woke up from sleep");
        expect(fs.existsSync(dumpPath)).to.be.true;

        const balanceBeforeLoad = await dummyMint();
        expect(balanceBeforeLoad).to.equal(balanceBeforeDump + BigInt(DUMMY_AMOUNT));

        await devnetProvider.load(dumpPath);
        const finalBalance = dummyMint();

        expect(finalBalance).to.equal(balanceBeforeDump + BigInt(DUMMY_AMOUNT));
    });
});
