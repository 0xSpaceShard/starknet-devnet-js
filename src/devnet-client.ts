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

    public async restart(): Promise<void> {
        await this.rpcClient.sendRequest("devnet_restart");
    }

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

    public async getPredeployedAccounts(): Promise<Array<PredeployedAccount>> {
        return await this.rpcClient.sendRequest("devnet_getPredeployedAccounts");
    }
}
