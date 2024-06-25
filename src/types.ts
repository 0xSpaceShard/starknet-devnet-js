export type BigNumberish = string | number | bigint;

export interface PredeployedAccount {
    initial_balance: string;
    private_key: string;
    public_key: string;
    address: string;
}
