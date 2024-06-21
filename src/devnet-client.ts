import axios, { AxiosInstance } from "axios";
import { Postman } from "./postman";
import { RpcClient } from "./rpc-client";
import { BigNumberish } from "./types";

const HTTP_TIMEOUT = 2000; // ms
const DEFAULT_DEVNET_URL = "http://localhost:5050";

export type DevnetClientConfig = {
    url?: string;
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
            timeout: HTTP_TIMEOUT,
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

    public async mint(
        address: string,
        amount: BigNumberish,
        unit: BalanceUnit = "WEI",
    ): Promise<MintResponse> {
        const respData = await this.rpcClient.sendRequest("devnet_mint", {
            address,
            amount: amount.toString(), // stringify to ensure serializability
            unit,
        });

        return {
            new_balance: BigInt(respData.new_balance),
            unit: respData.unit,
            tx_hash: respData.tx_hash,
        };
    }
}
