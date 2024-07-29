import * as path from "path";
import * as fs from "fs";
import { DevnetProvider } from "..";
import { expect } from "chai";

describe("Devnet persistence", async function () {
    this.timeout(10_000); // ms

    const WORKDIR = ".";
    const DUMP_EXTENSION = ".dump.json";

    const DUMMY_ADDRESS = "0x1";
    const DUMMY_AMOUNT = 20n;

    const devnetProvider = new DevnetProvider();

    function removeDumps() {
        for (const fileName of fs.readdirSync(WORKDIR)) {
            if (fileName.endsWith(DUMP_EXTENSION)) {
                const file = path.join(WORKDIR, fileName);
                fs.unlinkSync(file);
            }
        }
    }

    beforeEach("clear workdir and Devnet state", async function () {
        removeDumps();
        await devnetProvider.restart();
    });

    afterEach("clear workdir", function () {
        removeDumps();
    });

    function getRandomDumpPath() {
        const name = `persisted_devnet_${Math.random().toString().slice(2)}${DUMP_EXTENSION}`;
        return path.join(WORKDIR, name);
    }

    async function dummyMint() {
        const { new_balance } = await devnetProvider.mint(DUMMY_ADDRESS, DUMMY_AMOUNT);
        return new_balance;
    }

    it("should dump and load", async function () {
        const dumpPath = getRandomDumpPath();

        const balanceBeforeDump = await dummyMint();
        await devnetProvider.dump(dumpPath);

        const balanceBeforeLoad = await dummyMint();
        expect(balanceBeforeLoad).to.equal(balanceBeforeDump + BigInt(DUMMY_AMOUNT));

        await devnetProvider.load(dumpPath);
        const finalBalance = await dummyMint();

        expect(finalBalance).to.equal(balanceBeforeDump + BigInt(DUMMY_AMOUNT));
    });

    it("should dump without providing a path in request", async function () {
        await dummyMint(); // dumping is skipped if there are no transactions, so we add one
        await devnetProvider.dump();
    });
});
