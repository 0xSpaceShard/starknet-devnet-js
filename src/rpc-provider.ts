import { AxiosError, AxiosInstance } from "axios";
import { DevnetProviderError } from "./types";

export class RpcProvider {
    public constructor(
        private httpProvider: AxiosInstance,
        private url: string,
    ) {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async sendRequest(method: string, params: unknown = {}): Promise<any> {
        return this.httpProvider
            .post(this.url, {
                jsonrpc: "2.0",
                id: "1",
                method,
                params,
            })
            .then((resp) => {
                if ("result" in resp.data) {
                    return resp.data["result"];
                } else if ("error" in resp.data) {
                    // not wrapping in new Error to avoid printing as [Object object]
                    throw resp.data["error"];
                } else {
                    throw resp.data;
                }
            })
            .catch((err) => {
                if (err.code === AxiosError.ECONNABORTED) {
                    throw new DevnetProviderError(
                        `${err.message}. Try specifying a greater timeout in DevnetProvider({...})`,
                    );
                }
                throw err;
            });
    }
}
