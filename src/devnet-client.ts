import axios, { AxiosInstance } from "axios";

const RPC_URL = "/";
const HTTP_TIMEOUT = 2000; // ms
const DEFAULT_DEVNET_URL = "http://localhost:5050";

export type DevnetClientConfig = {
    url?: string;
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
    private async sendRpc(method: string, params: any) {
        return this.httpClient.post(RPC_URL, {
            jsonrpc: "2.0",
            id: "1",
            method,
            params,
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
}
