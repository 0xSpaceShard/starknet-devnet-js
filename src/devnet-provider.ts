import axios, { AxiosInstance } from "axios";
import { Postman } from "./postman";
import { RpcProvider } from "./rpc-provider";
import { BalanceUnit, PredeployedAccount } from "./types";

/** milliseconds */
const DEFAULT_HTTP_TIMEOUT = 30_000;
const DEFAULT_DEVNET_URL = "http://127.0.0.1:5050";

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

export class DevnetProvider {
    public readonly url: string;
    private httpProvider: AxiosInstance;
    private rpcProvider: RpcProvider;

    /** Handles L1-L2 communication. */
    public readonly postman: Postman;

    public constructor(config?: DevnetProviderConfig) {
        this.url = config?.url || DEFAULT_DEVNET_URL;
        this.httpProvider = axios.create({
            baseURL: this.url,
            timeout: config?.timeout ?? DEFAULT_HTTP_TIMEOUT,
            maxRedirects: 3,
            proxy: false,
        });
        this.rpcProvider = new RpcProvider(this.httpProvider, this.url);
        this.postman = new Postman(this.rpcProvider);
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
     * Restart the state of the underlying Devnet instance.
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/dump-load-restart#restarting
     */
    public async restart(): Promise<void> {
        await this.rpcProvider.sendRequest("devnet_restart");
    }

    /**
     * Generate funds at the provided address. For return spec and more info, see
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/balance#mint-token---local-faucet
     * @param address the account address to receive funds
     * @param amount how much to mint
     * @param unit specifier of the currency unit
     */
    public async mint(
        address: string,
        amount: number,
        unit: BalanceUnit = "WEI",
    ): Promise<MintResponse> {
        const respData = await this.rpcProvider.sendRequest("devnet_mint", {
            address,
            amount,
            unit,
        });

        return {
            new_balance: BigInt(respData.new_balance),
            unit: respData.unit,
            tx_hash: respData.tx_hash,
        };
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/predeployed#how-to-get-predeployment-info
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
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/blocks
     * @returns the block hash of the newly created block
     */
    public async createBlock(): Promise<NewBlockResponse> {
        return await this.rpcProvider.sendRequest("devnet_createBlock");
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/blocks
     * @returns hash values of aborted blocks
     */
    public async abortBlocks(startingBlockHash: string): Promise<AbortedBlocksResponse> {
        return await this.rpcProvider.sendRequest("devnet_abortBlocks", {
            starting_block_hash: startingBlockHash,
        });
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/next/starknet-time#set-time
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
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/next/starknet-time#increase-time
     * @returns the new time in unix seconds
     */
    public async increaseTime(increment: number): Promise<IncreaseTimeResponse> {
        return await this.rpcProvider.sendRequest("devnet_increaseTime", {
            time: increment,
        });
    }

    /**
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/dump-load-restart#dumping
     * @param path the path where your Devnet instance will be serialized; if not provided, defaults to the dump-path provided via CLI on Devnet startup.
     */
    public async dump(path?: string): Promise<void> {
        return await this.rpcProvider.sendRequest("devnet_dump", { path });
    }

    /**
     * After loading, this DevnetProvider instance will be connected to the loaded Devnet instance.
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/dump-load-restart#dumping
     * @param path the path from which a Devnet instance will be deserialized
     */
    public async load(path: string): Promise<void> {
        return await this.rpcProvider.sendRequest("devnet_load", { path });
    }
}
