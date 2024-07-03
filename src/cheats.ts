import { RpcProvider } from "./rpc-provider";

export class Cheats {
    constructor(private rpcProvider: RpcProvider) {}

    public async impersonateAccount() {
        throw new Error("Not implemented");
    }

    public async stopImpesonatingAccount() {
        throw new Error("Not implemented");
    }

    public async autoImpersonate() {
        throw new Error("Not implemented");
    }

    public async stopAutoImpersonate() {
        throw new Error("Not implemented");
    }
}
