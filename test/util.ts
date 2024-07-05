import * as starknet from "starknet";
import { readFileSync } from "fs";
import { expect } from "chai";
import { DevnetProvider } from "..";

export function getContractArtifact(contractPath: string) {
    return starknet.json.parse(readFileSync(contractPath).toString("ascii"));
}

export function expectHexEquality(h1: string, h2: string) {
    expect(BigInt(h1).toString()).to.equal(BigInt(h2).toString());
}

export async function getPredeployedAccount(
    devnetProvider: DevnetProvider,
    starknetProvider: starknet.RpcProvider,
) {
    const predeployedAccountData = (await devnetProvider.getPredeployedAccounts())[0];

    return new starknet.Account(
        starknetProvider,
        predeployedAccountData.address,
        predeployedAccountData.private_key,
    );
}
