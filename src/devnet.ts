import { ChildProcess, spawn as spawnChildProcess, StdioOptions } from "child_process";
import { DevnetProvider } from "./devnet-provider";
import { DevnetError } from "./types";
import { isFreePort, sleep } from "./util";
import {
    DEFAULT_DEVNET_HOST,
    DEFAULT_DEVNET_PORT,
    LATEST_COMPATIBLE_DEVNET_VERSION,
} from "./constants";
import { VersionHandler } from "./version-handler";

export interface DevnetConfig {
    args?: string[];
    stdio?: StdioOptions;
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

    /**
     * Assumes there is a `starknet-devnet` present in the environment and executes it.
     * @param config an object for configuring Devnet
     * @returns a newly spawned Devnet instance
     */
    static async spawn(config: DevnetConfig = {}): Promise<Devnet> {
        return this.spawnCommand("starknet-devnet", config);
    }

    /**
     * Spawns a new Devnet using the provided command and optional args in `config`.
     * If you don't have a local Devnet, but know the version you would like to run, use {@link spawnCommand}.
     * @param command the command used for starting Devnet; can be a path
     * @param config configuration object
     * @returns a newly spawned Devnet instance
     */
    static async spawnCommand(command: string, config: DevnetConfig = {}): Promise<Devnet> {
        const args = config.args || [];
        const devnetUrl = await ensureUrl(args);

        const devnetProcess = spawnChildProcess(command, args, {
            detached: true,
            stdio: config.stdio || "inherit",
        });
        devnetProcess.unref();

        const devnetInstance = new Devnet(devnetProcess, new DevnetProvider({ url: devnetUrl }));
        // store it now to ensure it's cleaned up automatically if the remaining steps fail
        Devnet.instances.push(devnetInstance);

        return new Promise((resolve, reject) => {
            const maxStartupMillis = config?.maxStartupMillis ?? 5000;
            devnetInstance.ensureAlive(maxStartupMillis).then(() => resolve(devnetInstance));

            devnetProcess.on("error", function (e) {
                reject(e);
            });

            devnetProcess.on("exit", function () {
                if (devnetProcess.exitCode) {
                    reject(`Devnet exited with code ${devnetProcess.exitCode}. \
Check Devnet's logged output for more info. \
The output location is configurable via the config object passed to the Devnet spawning method.`);
                }
            });
        });
    }

    /**
     * Spawns a Devnet of the provided version. If not present locally, fetches it.
     * If you already have a local Devnet you would like to run, use {@link spawnCommand}.
     * @param version if set to `"latest"`, uses the latest Devnet version compatible with this library;
     *     otherwise needs to be a semver string with a prepended "v" (e.g. "v1.2.3") and
     *     should be available in https://github.com/0xSpaceShard/starknet-devnet-rs/releases
     * @param config configuration object
     * @returns a newly spawned Devnet instance
     */
    static async spawnVersion(version: string, config: DevnetConfig = {}): Promise<Devnet> {
        version = version === "latest" ? LATEST_COMPATIBLE_DEVNET_VERSION : version;

        const command = await VersionHandler.getExecutable(version);
        return this.spawnCommand(command, config);
    }

    private async ensureAlive(maxStartupMillis: number): Promise<void> {
        const checkPeriod = 100; // ms
        const maxIterations = maxStartupMillis / checkPeriod;

        for (let i = 0; !this.process.exitCode && i < maxIterations; ++i) {
            if (await this.provider.isAlive()) {
                return;
            }
            await sleep(checkPeriod);
        }

        throw new DevnetError(
            "Could not spawn Devnet! Ensure that you can spawn using the chosen method or increase the startup time.",
        );
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
