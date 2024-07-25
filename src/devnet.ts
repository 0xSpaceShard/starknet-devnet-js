import { ChildProcess, spawn as spawnChildProcess } from "child_process";
import { DevnetProvider, DEFAULT_DEVNET_PORT, DEFAULT_DEVNET_HOST } from "./devnet-provider";
import { DevnetError } from "./types";
import { isFreePort, sleep } from "./util";

export interface DevnetConfig {
    args?: string[];
    output?: string;
    maxStartupMillis?: number;
}

/**
 * Attempt to extract the URL from the provided Devnet CLI args. If host or present not present,
 * populates the received array with default values. The host defaults to 127.0.0.1 and the port
 * is randomly assigned.
 * @param args CLI args to Devnet
 * @returns the URL enabling communication with the Devnet instance
 */
async function ensureUrl(args: string[]): Promise<string> {
    let host: string;
    const hostParamIndex = args.indexOf("--host");
    if (hostParamIndex === -1) {
        host = DEFAULT_DEVNET_HOST;
        args.push(...["--host", host]);
    } else {
        host = args[hostParamIndex + 1];
    }

    let port: string;
    const portParamIndex = args.indexOf("--port");
    if (portParamIndex === -1) {
        port = await getFreePort();
        args.push(...["--port", port]);
    } else {
        port = args[portParamIndex + 1];
    }

    return `http://${host}:${port}`;
}

async function ensureAlive(provider: DevnetProvider, maxStartupMillis: number): Promise<void> {
    const checkPeriod = 100; // ms
    const maxIterations = maxStartupMillis / checkPeriod;

    for (let i = 0; i < maxIterations; ++i) {
        if (await provider.isAlive()) {
            return;
        }
        await sleep(checkPeriod);
    }

    throw new DevnetError(
        "Could not spawn Devnet! Ensure that you can spawn using the chosen method or increase the startup time.",
    );
}

async function getFreePort(): Promise<string> {
    const step = 1000;
    const maxPort = 65535;
    for (let port = DEFAULT_DEVNET_PORT + step; port <= maxPort; port += step) {
        if (await isFreePort(port)) {
            return port.toString();
        }
    }

    throw new DevnetError("Could not find a free port! Try rerunning your command.");
}

export class Devnet {
    static instances: Devnet[] = [];

    private constructor(
        private process: ChildProcess,
        public provider: DevnetProvider,
    ) {}

    static async spawn(config: DevnetConfig = {}): Promise<Devnet> {
        return this.spawnCommand("starknet-devnet", config);
    }

    static async spawnCommand(command: string, config: DevnetConfig = {}): Promise<Devnet> {
        const args = config.args || [];
        const devnetUrl = await ensureUrl(args);

        const devnetProcess = spawnChildProcess(command, args, {
            detached: true,
            stdio: "inherit",
        });
        devnetProcess.unref();

        const devnetInstance = new Devnet(devnetProcess, new DevnetProvider({ url: devnetUrl }));
        // store it now to ensure it's cleaned up automatically if the remaining steps fail
        Devnet.instances.push(devnetInstance);

        await ensureAlive(devnetInstance.provider, config?.maxStartupMillis ?? 5000);
        return devnetInstance;
    }

    static async spawnVersion(_version: string, _config: DevnetConfig = {}): Promise<Devnet> {
        // get the right artifact according to platform and os
        throw new Error("Not implemented");
    }

    /**
     * Sends the provided signal to the underlying Devnet process.
     * @param signal the signal to be sent; deaults to `SIGTERM`
     * @returns `true` if successful; `false` otherwise
     */
    public kill(signal: NodeJS.Signals = "SIGTERM"): boolean {
        return this.process.kill(signal);
    }

    static cleanup() {
        for (const instance of Devnet.instances) {
            if (!instance.process.killed) {
                instance.kill();
            }
        }
    }
}

for (const event of ["exit", "SIGINT", "SIGTERM", "SIGQUIT", "uncaughtException"]) {
    process.on(event, Devnet.cleanup);
}
