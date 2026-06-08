import { RpcProvider } from "./rpc-provider";

export class Cheats {
    constructor(private rpcProvider: RpcProvider) {}

    /**
     * Deactivate using `stopImpersonateAccount`.
     *
     * https://starknet-io.github.io/starknet-devnet/docs/account-impersonation
     * @param address the address of a locally non-present account that you want to impersonate
     */
    public async impersonateAccount(address: string): Promise<void> {
        await this.rpcProvider.sendRequest("devnet_impersonateAccount", {
            account_address: address,
        });
    }

    /**
     * https://starknet-io.github.io/starknet-devnet/docs/account-impersonation
     * @param address the address of a locally non-present account that you want to stop impersonating
     */
    public async stopImpersonateAccount(address: string): Promise<void> {
        await this.rpcProvider.sendRequest("devnet_stopImpersonateAccount", {
            account_address: address,
        });
    }

    /**
     * Enables automatic account impersonation. Every account that does not exist in the local state will be impersonated. Deactivate using `stopAutoImpersonate`.
     *
     * https://starknet-io.github.io/starknet-devnet/docs/account-impersonation
     */
    public async autoImpersonate(): Promise<void> {
        await this.rpcProvider.sendRequest("devnet_autoImpersonate");
    }

    /**
     * https://starknet-io.github.io/starknet-devnet/docs/account-impersonation
     */
    public async stopAutoImpersonate(): Promise<void> {
        await this.rpcProvider.sendRequest("devnet_stopAutoImpersonate");
    }
}
