import axios, { AxiosInstance } from "axios";
import { Postman } from "./postman";
import { Cheats } from "./cheats";
import { RpcProvider } from "./rpc-provider";
import { BalanceUnit, BlockId, PredeployedAccount, toRpcBlockId } from "./types";
import { DEFAULT_DEVNET_URL, DEFAULT_HTTP_TIMEOUT } from "./constants";

export type DevnetProviderConfig = {
    url?: string;
    /** milliseconds */
    timeout?: number;
};

export type MintResponse = {
    new_balance: bigint;
    unit: BalanceUnit;
    tx_hash: string;
};

export interface NewBlockResponse {
    block_hash: string;
}

export interface AbortedBlocksResponse {
    aborted: Array<string>;
}

export interface SetTimeResponse {
    time: number;
    block_hash?: string;
}

export interface IncreaseTimeResponse {
    time: number;
    block_hash: string;
}

export interface GasModificationResponse {
    l1_gas_price?: bigint;
    l1_data_gas_price?: bigint;
    l2_gas_price?: bigint;
}

export class DevnetProvider {
    public readonly url: string;
    private httpProvider: AxiosInstance;
    private rpcProvider: RpcProvider;

    /** Contains methods for L1-L2 communication. */
    public readonly postman: Postman;

    /** Contains methods for cheating, e.g. account impersonation. */
    public readonly cheats: Cheats;

    public constructor(config?: DevnetProviderConfig) {
        this.url = config?.url || DEFAULT_DEVNET_URL;
        this.httpProvider = axios.create({
            baseURL: this.url,
            timeout: config?.timeout ?? DEFAULT_HTTP_TIMEOUT,
        });
        this.rpcProvider = new RpcProvider(this.httpProvider, this.url);
        this.postman = new Postman(this.rpcProvider);
        this.cheats = new Cheats(this.rpcProvider);
    }

    /**
     * @returns `true` if the underlying Devnet instance is responsive; `false` otherwise
     */
    public async isAlive(): Promise<boolean> {
        return this.httpProvider
            .get("/is_alive")
            .then((resp) => resp.status === axios.HttpStatusCode.Ok)
            .catch(() => false);
    }

    /**
     * Restart the state of the underlying Devnet instance. You may opt to restart L1-L2 messaging.
     * https://0xspaceshard.github.io/starknet-devnet/docs/dump-load-restart#restarting
     */
    public async restart(params: { restartL1ToL2Messaging?: boolean } = {}): Promise<void> {
        await this.rpcProvider.sendRequest("devnet_restart", {
            restart_l1_to_l2_messaging: params.restartL1ToL2Messaging,
        });
    }

    /**
     * Generate funds at the provided address. For return spec and more info, see
     * https://0xspaceshard.github.io/starknet-devnet/docs/balance#mint-token---local-faucet
     * @param address the account address to receive funds
     * @param amount how much to mint
     * @param unit specifier of the currency unit; defaults to FRI
     */
    public async mint(
        address: string,
        amount: bigint,
        unit: BalanceUnit = "FRI",
    ): Promise<MintResponse> {
        const paramsSerialized = `{
            "address": "${address}",
            "amount": ${amount},
            "unit": "${unit}"
        }`;
        const respData = await this.rpcProvider.sendRequest("devnet_mint", paramsSerialized);

        return {
            new_balance: BigInt(respData.new_balance),
            unit: respData.unit,
            tx_hash: respData.tx_hash,
        };
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet/docs/predeployed#how-to-get-predeployment-info
     * @returns a list of containing information on predeployed accounts. Load an account using e.g. starknet.js.
     */
    public async getPredeployedAccounts(
        additionalArgs = { withBalance: false },
    ): Promise<Array<PredeployedAccount>> {
        return await this.rpcProvider.sendRequest("devnet_getPredeployedAccounts", {
            with_balance: additionalArgs.withBalance,
        });
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet/docs/blocks
     * @returns the block hash of the newly created block
     */
    public async createBlock(): Promise<NewBlockResponse> {
        return await this.rpcProvider.sendRequest("devnet_createBlock");
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet/docs/blocks
     * @param staringBlockId the block ID of the block after which (inclusive) all blocks
     *      should be aborted. See docs {@link BlockId} for more info.
     * @returns hash values of aborted blocks
     */
    public async abortBlocks(startingBlockId: BlockId): Promise<AbortedBlocksResponse> {
        return await this.rpcProvider.sendRequest("devnet_abortBlocks", {
            starting_block_id: toRpcBlockId(startingBlockId),
        });
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet/docs/next/starknet-time#set-time
     * @returns the new time in unix seconds and, if block creation requested, the hash of the created block
     */
    public async setTime(
        time: number,
        additionalArgs = { generateBlock: false },
    ): Promise<SetTimeResponse> {
        return await this.rpcProvider.sendRequest("devnet_setTime", {
            time,
            generate_block: additionalArgs.generateBlock,
        });
    }

    /**
     * Increase the time by the provided `increment` seconds.
     * https://0xspaceshard.github.io/starknet-devnet/docs/next/starknet-time#increase-time
     * @returns the new time in unix seconds
     */
    public async increaseTime(increment: number): Promise<IncreaseTimeResponse> {
        return await this.rpcProvider.sendRequest("devnet_increaseTime", {
            time: increment,
        });
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet/docs/dump-load-restart#dumping
     * @param path the path where your Devnet instance will be serialized; if not provided, defaults to the dump-path provided via CLI on Devnet startup.
     */
    public async dump(path?: string): Promise<void> {
        return await this.rpcProvider.sendRequest("devnet_dump", { path });
    }

    /**
     * After loading, this DevnetProvider instance will be connected to the loaded Devnet instance.
     * https://0xspaceshard.github.io/starknet-devnet/docs/dump-load-restart#dumping
     * @param path the path from which a Devnet instance will be deserialized
     */
    public async load(path: string): Promise<void> {
        return await this.rpcProvider.sendRequest("devnet_load", { path });
    }

    public async setGasPrices(prices: {
        l1_gas_price?: bigint;
        l1_data_gas_price?: bigint;
        l2_gas_price?: bigint;
        generate_block?: boolean;
    }): Promise<GasModificationResponse> {
        const newGasPrices = await this.rpcProvider.sendRequest("devnet_setGasPrice", {
            gas_price_fri: prices.l1_gas_price,
            data_gas_price_fri: prices.l1_data_gas_price,
            l2_gas_price_fri: prices.l2_gas_price,
            generate_block: prices.generate_block,
        });

        return {
            l1_gas_price: newGasPrices.gas_price_fri,
            l1_data_gas_price: newGasPrices.data_gas_price_fri,
            l2_gas_price: newGasPrices.l2_gas_price_fri,
        };
    }
}
