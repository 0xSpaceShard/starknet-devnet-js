import * as starknet from "starknet";
import { readFileSync } from "fs";
import { expect } from "chai";

export function getContractArtifact(contractPath: string) {
    return starknet.json.parse(readFileSync(contractPath).toString("ascii"));
}

export function expectHexEquality(h1: string, h2: string) {
    expect(BigInt(h1).toString()).to.equal(BigInt(h2).toString());
}
