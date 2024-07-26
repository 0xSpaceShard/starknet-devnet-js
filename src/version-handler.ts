import axios, { AxiosInstance } from "axios";
import path from "path";
import fs from "fs";
import os from "os";
import { DEFAULT_HTTP_TIMEOUT } from "./constants";
import { DevnetError, GithubError } from "./types";
import decompress from "decompress";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const decompressTargz = require("decompress-targz");

export class VersionHandler {
    static httpProvider: AxiosInstance = axios.create({
        timeout: DEFAULT_HTTP_TIMEOUT,
    });

    static localStoragePath: string = path.join(os.tmpdir(), "devnet-versions");

    private static getVersionDir(version: string): string {
        return path.join(this.localStoragePath, version);
    }

    private static getExecutablePath(versionDir: string): string {
        return path.join(versionDir, "starknet-devnet");
    }

    /**
     * Ensure that the command corresponding to the provided `version` exists.
     * @param version semver string with a prepended "v";
     *      should be available in https://github.com/0xSpaceShard/starknet-devnet-rs/releases
     * @returns the path to the executable corresponding to the version
     */
    static async getExecutable(version: string): Promise<string> {
        const versionDir = this.getVersionDir(version);
        const executable = this.getExecutablePath(versionDir);
        if (fs.existsSync(executable)) {
            return executable;
        }

        const executableUrl = await this.getArchivedExecutableUrl(version);
        const archivePath = await this.fetchArchivedExecutable(executableUrl, versionDir);
        await this.extract(archivePath, versionDir);
        return executable;
    }

    private static getCompatibleArch(): string {
        switch (process.arch) {
            case "arm64":
                return "aarch64";
            case "x64":
                return "x86_64";
            default:
                throw new DevnetError(`Incompatible architecture: ${process.platform}`);
        }
    }

    private static getCompatiblePlatform(): string {
        switch (process.platform) {
            case "linux":
                return "linux-gnu";
            case "darwin":
                return "darwin";
            default:
                throw new DevnetError(`Incompatible platform: ${process.platform}`);
        }
    }

    private static async getArchivedExecutableUrl(version: string): Promise<string> {
        const releasesUrl = "https://api.github.com/repos/0xSpaceShard/starknet-devnet-rs/releases";
        const releasesResp = await this.httpProvider.get(releasesUrl);

        if (releasesResp.status !== axios.HttpStatusCode.Ok) {
            throw new GithubError(releasesResp.statusText);
        }

        if (!Array.isArray(releasesResp.data)) {
            throw new GithubError(`Invalid response: ${JSON.stringify(releasesResp.data)}`);
        }

        let versionPresent = false;
        for (const release of releasesResp.data) {
            if (release.name === version) {
                versionPresent = true;
                break;
            }
        }

        if (!versionPresent) {
            throw new GithubError(
                `Version not found. If specifying an exact version, make sure you prepended the 'v' and that the version really exists in ${releasesUrl}.`,
            );
        }

        const arch = this.getCompatibleArch();
        const platform = this.getCompatiblePlatform();
        return `https://github.com/0xSpaceShard/starknet-devnet-rs/releases/download/${version}/starknet-devnet-${arch}-unknown-${platform}.tar.gz`;
    }

    /**
     * @param url the url of the archived executable
     * @param versionDir the path to the directory where the archive will be written and extracted
     * @returns the path where the archive was stored
     */
    private static async fetchArchivedExecutable(url: string, versionDir: string): Promise<string> {
        const resp = await this.httpProvider.get(url, { responseType: "stream" });
        if (resp.status === axios.HttpStatusCode.NotFound) {
            throw new GithubError(`Not found: ${url}`);
        } else if (resp.status !== axios.HttpStatusCode.Ok) {
            throw new GithubError(resp.statusText);
        }

        if (!fs.existsSync(versionDir)) {
            fs.mkdirSync(versionDir, { recursive: true });
        }

        const archivedExecutablePath = path.join(versionDir, "archive.tar.gz");
        const writer = fs.createWriteStream(archivedExecutablePath);

        return new Promise((resolve, reject) => {
            resp.data.pipe(writer);

            let error: Error;
            writer.on("error", (e) => {
                error = e;
                writer.close();
                reject(error);
            });

            writer.on("close", () => {
                if (!error) {
                    resolve(archivedExecutablePath);
                }
                // no need to call `reject` here, as it will have been called in the
                // "error" stream;
            });
        });
    }

    /**
     * Extract the content of the archive.
     * @param archivePath the local path of the archive
     */
    private static async extract(archivePath: string, targetDir: string): Promise<void> {
        await decompress(archivePath, targetDir, {
            plugins: [decompressTargz()],
        });
    }
}
