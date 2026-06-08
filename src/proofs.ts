import { L2ToL1Message } from "./postman";
import { RpcProvider } from "./rpc-provider";
import { BlockId, toRpcBlockId } from "./types";

/**
 * Resource bounds for a transaction (gas/data gas).
 * Compatible with starknet.js RPC.RESOURCE_BOUNDS type.
 */
export interface ResourceBounds {
    max_amount: string;
    max_price_per_unit: string;
}

/**
 * Full resource bounds for INVOKE v3 transaction.
 * Compatible with starknet.js RPC.RESOURCE_BOUNDS_MAPPING type.
 */
export interface ResourceBoundsMapping {
    l1_gas: ResourceBounds;
    l1_data_gas: ResourceBounds;
    l2_gas: ResourceBounds;
}

export type DataAvailabilityMode = "L1" | "L2";

/**
 * INVOKE v3 transaction payload.
 * Compatible with starknet.js RPC.INVOKE_TXN_V3 type.
 * https://starknet-io.github.io/starknet-devnet/docs/proofs
 */
export interface InvokeV3Transaction {
    type: "INVOKE";
    version: "0x3";
    sender_address: string;
    calldata: string[];
    signature: string[];
    nonce: string;
    resource_bounds: ResourceBoundsMapping;
    tip: string;
    paymaster_data: string[];
    account_deployment_data: string[];
    nonce_data_availability_mode: DataAvailabilityMode;
    fee_data_availability_mode: DataAvailabilityMode;
}

/**
 * L2 to L1 message included in the proof response, ordered by emission.
 */
export interface ProofL2ToL1Message extends L2ToL1Message {
    order: number;
}

/**
 * Response from `starknet_proveTransaction`
 * https://starknet-io.github.io/starknet-devnet/docs/proofs
 */
export interface ProveTransactionResponse {
    /** Base64-encoded mock proof */
    proof: string;
    /** Array of 9 hex strings (includes messages_hash in devnet mode) */
    proof_facts: string[];
    /** L2 to L1 messages extracted by simulating the transaction */
    l2_to_l1_messages: ProofL2ToL1Message[];
}

/**
 * Transaction proofs handler for Devnet.
 *
 * This covers `starknet_proveTransaction`, a Devnet extension for proving/validating
 * `INVOKE v3` transaction payloads. For configuration (proof modes), see:
 * https://starknet-io.github.io/starknet-devnet/docs/proofs
 */
export class Proofs {
    constructor(private rpcProvider: RpcProvider) {}

    /**
     * Prove an INVOKE v3 transaction payload.
     *
     * Returns a deterministic mock proof and proof facts in `devnet` proof mode (default).
     * Returns an error in `none` mode (disabled) or `full` mode (not implemented).
     *
     * If the transaction simulation fails (e.g. execution reverts), an error is returned
     * instead of a proof.
     *
     * https://starknet-io.github.io/starknet-devnet/docs/proofs
     *
     * @param blockId the block context for proving (e.g. "latest", block number, or block hash)
     * @param transaction the INVOKE v3 transaction payload to prove
     * @returns proof data including the proof, proof_facts, and l2_to_l1_messages
     */
    public async proveTransaction(
        blockId: BlockId,
        transaction: InvokeV3Transaction,
    ): Promise<ProveTransactionResponse> {
        return await this.rpcProvider.sendRequest("starknet_proveTransaction", {
            block_id: toRpcBlockId(blockId),
            transaction,
        });
    }
}
