import { RpcProvider } from "./rpc-provider";
import { BigNumberish } from "./types";

function numericToHexString(numeric: BigNumberish): string {
    return "0x" + BigInt(numeric).toString(16);
}

export interface L1ToL2Message {
    l2_contract_address: string;
    entry_point_selector: string;
    l1_contract_address: string;
    payload: Array<string>;
    paid_fee_on_l1: string;
    nonce: string;
}

export interface L2ToL1Message {
    from_address: string;
    payload: string[];
    to_address: string;
}

export interface FlushResponse {
    messages_to_l1: Array<L2ToL1Message>;
    messages_to_l2: Array<L1ToL2Message>;
    generated_l2_transactions: Array<string>;
    l1_provider: string;
}

export interface LoadL1MessagingContractResponse {
    messaging_contract_address: string;
}

export interface L1ToL2MockTxRequest {
    l2_contract_address: string;
    l1_contract_address: string;
    entry_point_selector: string;
    payload: Array<number>;
    nonce: string;
    paidFeeOnL1: string;
}

export interface L1ToL2MockTxResponse {
    transaction_hash: string;
}

export interface L2ToL1MockTxRequest {
    l2_contract_address: string;
    l1_contract_address: string;
    payload: Array<number>;
}

export interface L2ToL1MockTxResponse {
    message_hash: string;
}

/**
 * https://0xspaceshard.github.io/starknet-devnet/docs/postman
 */
export class Postman {
    public constructor(private rpcProvider: RpcProvider) {}

    /**
     * https://0xspaceshard.github.io/starknet-devnet/docs/postman#flush
     */
    public async flush(additionalArgs = { dryRun: false }): Promise<FlushResponse> {
        return this.rpcProvider.sendRequest("devnet_postmanFlush", {
            dry_run: additionalArgs.dryRun,
        });
    }

    /**
     * If `address` specified, tries to load an L1 messaging contract from that address.
     * If `address` omitted, deploys a new messaging contract by relying on the first predeployed
     * account * of the L1 network specified with `networkUrl`, assuming default mnemonic seed.
     * If this * predeployed account assumption does not hold, you should specify the private key
     * of the account to be used in `deployer_account_private_key`.
     * More info in: https://0xspaceshard.github.io/starknet-devnet/docs/postman#load
     */
    public async loadL1MessagingContract(
        networkUrl: string,
        messagingContractAddress?: string,
        deployerAccountPrivateKey?: string,
    ): Promise<LoadL1MessagingContractResponse> {
        if (!!messagingContractAddress && !!deployerAccountPrivateKey) {
            throw new Error(
                "Both parameters cannot be specified simulatenously: `address`, `deployer_account_private_key`",
            );
        }
        return await this.rpcProvider.sendRequest("devnet_postmanLoad", {
            messaging_contract_address: messagingContractAddress,
            network_url: networkUrl,
            deployer_account_private_key: deployerAccountPrivateKey,
        });
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet/docs/postman#mock-transactions
     */
    public async sendMessageToL2(
        l2ContractAddress: string,
        entryPointSelector: string,
        l1ContractAddress: string,
        payload: BigNumberish[],
        nonce: BigNumberish,
        paidFeeOnL1: BigNumberish,
    ): Promise<L1ToL2MockTxResponse> {
        return await this.rpcProvider.sendRequest("devnet_postmanSendMessageToL2", {
            l2_contract_address: l2ContractAddress,
            entry_point_selector: entryPointSelector,
            l1_contract_address: l1ContractAddress,
            payload: payload.map(numericToHexString),
            nonce: numericToHexString(nonce),
            paid_fee_on_l1: numericToHexString(paidFeeOnL1),
        });
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet/docs/postman#l2-l1
     */
    public async consumeMessageFromL2(
        fromAddress: string,
        toAddress: string,
        payload: BigNumberish[],
    ): Promise<L2ToL1MockTxResponse> {
        return await this.rpcProvider.sendRequest("devnet_postmanConsumeMessageFromL2", {
            from_address: fromAddress,
            to_address: toAddress,
            payload: payload.map(numericToHexString),
        });
    }
}
