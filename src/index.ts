import axios, { Axios } from "axios";

export class Client {
    private httpClient: Axios = new Axios();

    public async isAlive(): Promise<boolean> {
        const resp = await this.httpClient.get("/is_alive");
        return resp.status === axios.HttpStatusCode.Ok;
    }
}
