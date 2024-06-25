import { AxiosInstance } from "axios";

export class RpcProvider {
    public constructor(
        private httpProvider: AxiosInstance,
        private url: string,
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async sendRequest(method: string, params: unknown = {}): Promise<any> {
        const resp = await this.httpProvider.post(this.url, {
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
}
