import net from "net";

export async function sleep(millis: number): Promise<void> {
    await new Promise((resolve, _) => setTimeout(resolve, millis));
}

export function isFreePort(port: number): Promise<boolean> {
    return new Promise((accept, reject) => {
        const sock = net.createConnection(port);
        sock.once("connect", () => {
            sock.end();
            accept(false);
        });
        sock.once("error", (e: NodeJS.ErrnoException) => {
            sock.destroy();
            if (e.code === "ECONNREFUSED") {
                accept(true);
            } else {
                reject(e);
            }
        });
    });
}
