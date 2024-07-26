import { AxiosError } from "axios";

export type BigNumberish = string | number | bigint;

export type BalanceUnit = "WEI" | "FRI";

export interface PredeployedAccount {
    balance: {
        [key: string]: { amount: string; unit: BalanceUnit };
    };
    initial_balance: string;
    private_key: string;
    public_key: string;
    address: string;
}

export class DevnetProviderError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, DevnetProviderError.prototype);
    }

    public static fromAxiosError(err: AxiosError) {
        if (err.code === AxiosError.ECONNABORTED) {
            return new this(
                `${err.message}. Try specifying a greater timeout in DevnetProvider({...})`,
            );
        }

        throw new Error(`Cannot create a DevnetProviderError from ${err}`);
    }
}

export class DevnetError extends Error {
    constructor(msg: string) {
        super(msg);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, DevnetError.prototype);
    }
}

export class GithubError extends Error {
    constructor(msg: string) {
        super(`Unexpected response from GitHub: ${msg}`);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, DevnetError.prototype);
    }
}
