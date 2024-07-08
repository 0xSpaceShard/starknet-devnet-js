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
    starknetProvider: starknet.Provider,
) {
    const predeployedAccountData = (await devnetProvider.getPredeployedAccounts())[0];

    return new starknet.Account(
        starknetProvider,
        predeployedAccountData.address,
        predeployedAccountData.private_key,
    );
}

/**
 * Return the value associated to the variable name, or throw an error if not defined.
 */
export function getEnvVar(varName: string): string {
    if (varName in process.env) {
        return process.env[varName] as string;
    }
    throw new Error(`Environment variable not defined: ${varName}`);
}

export const ETH_TOKEN_CONTRACT_ADDRESS =
    "0x49D36570D4E46F48E99674BD3FCC84644DDD6B96F7C741B1562B82F9E004DC7";
export const STRK_TOKEN_CONTRACT_ADDRESS =
    "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

interface TokenBalanceConfig {
    tokenContractAddress?: string;
    blockIdentifier?: starknet.BlockIdentifier;
}

/**
 * @param accountAddress the address of the account whose balance you would like to know
 * @param provider the provider to the network where the account is deployed
 * @param config object holding the address of the ERC20 token contract to query (defaults to ETH) and block ID (defaults to pending)
 * @returns the balance of `accountAddress` in the specified token contract at the specified block
 */
export async function getAccountBalance(
    accountAddress: string,
    provider: starknet.Provider,
    config: TokenBalanceConfig = {},
): Promise<bigint> {
    const tokenContractAddress = config.tokenContractAddress ?? ETH_TOKEN_CONTRACT_ADDRESS;
    const blockIdentifier = config.blockIdentifier ?? starknet.BlockTag.pending;
    const tokenClass = await provider.getClassAt(tokenContractAddress, blockIdentifier);
    const tokenContract = new starknet.Contract(tokenClass.abi, tokenContractAddress, provider);

    return tokenContract.balanceOf(accountAddress, {
        blockIdentifier,
    });
}
