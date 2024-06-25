import axios, { AxiosInstance } from "axios";
import { Postman } from "./postman";
import { RpcClient } from "./rpc-client";
import { PredeployedAccount } from "./types";

const DEFAULT_HTTP_TIMEOUT = 10_000; // ms
const DEFAULT_DEVNET_URL = "http://127.0.0.1:5050";

export type DevnetClientConfig = {
    url?: string;
    timeout?: number;
};

export type BalanceUnit = "WEI" | "FRI";

export type MintResponse = {
    new_balance: bigint;
    unit: BalanceUnit;
    tx_hash: string;
};

export class DevnetClient {
    public url: string;
    private httpClient: AxiosInstance;
    private rpcClient: RpcClient;

    /** Handles L1-L2 communication. */
    public postman: Postman;

    public constructor(config?: DevnetClientConfig) {
        this.url = config?.url || DEFAULT_DEVNET_URL;
        this.httpClient = axios.create({
            baseURL: this.url,
            timeout: config?.timeout ?? DEFAULT_HTTP_TIMEOUT,
        });
        this.rpcClient = new RpcClient(this.httpClient, this.url);
        this.postman = new Postman(this.rpcClient);
    }

    /**
     * @returns `true` if the underlying Devnet instance is responsive; `false` otherwise
     */
    public async isAlive(): Promise<boolean> {
        return new Promise((resolve, _) => {
            this.httpClient
                .get("/is_alive")
                .then((resp) => {
                    resolve(resp.status === axios.HttpStatusCode.Ok);
                })
                .catch(() => resolve(false));
        });
    }

    /**
     * Restart the state of the underlying Devnet instance.
     * https://0xspaceshard.github.io/starknet-devnet-rs/docs/dump-load-restart#restarting
     */
    public async restart(): Promise<void> {
        await this.rpcClient.sendRequest("devnet_restart");
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
        const respData = await this.rpcClient.sendRequest("devnet_mint", {
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
    public async getPredeployedAccounts(): Promise<Array<PredeployedAccount>> {
        return await this.rpcClient.sendRequest("devnet_getPredeployedAccounts");
    }
}
