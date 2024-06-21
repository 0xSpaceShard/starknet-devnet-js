import axios, { AxiosInstance } from "axios";

const RPC_URL = "/";
const HTTP_TIMEOUT = 2000; // ms
const DEFAULT_DEVNET_URL = "http://localhost:5050";

export type DevnetClientConfig = {
    url?: string;
};

export type BigNumberish = string | number | bigint;

export type BalanceUnit = "WEI" | "FRI";

export type MintResponse = {
    new_balance: bigint;
    unit: BalanceUnit;
    tx_hash: string;
};

export class DevnetClient {
    public url: string;
    private httpClient: AxiosInstance;

    public constructor(config?: DevnetClientConfig) {
        this.url = config?.url || DEFAULT_DEVNET_URL;
        this.httpClient = axios.create({
            baseURL: this.url,
            timeout: HTTP_TIMEOUT,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async sendRpc(method: string, params: any): Promise<any> {
        const resp = await this.httpClient.post(RPC_URL, {
            jsonrpc: "2.0",
            id: "1",
            method,
            params,
        });

        return new Promise((resolve, reject) => {
            if ("result" in resp.data) {
                resolve(resp.data["result"]);
            } else if ("error" in resp.data) {
                reject(resp.data["error"]);
            } else {
                reject(resp.data);
            }
        });
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
        const respData = await this.sendRpc("devnet_mint", {
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
