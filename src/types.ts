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
}
