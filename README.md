[![npm package](https://img.shields.io/npm/v/starknet-devnet?color=blue)](https://www.npmjs.com/package/starknet-devnet)

# Introduction

Using this JavaScript/TypeScript library, you can spawn [Starknet Devnet](https://github.com/0xSpaceShard/starknet-devnet-rs/) without installing and running it in a separate terminal. You can interact with it via its specific [Devnet API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#devnet-api). To interact with any Starknet node or network (including Starknet Devnet) via the [Starknet JSON-RPC API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#starknet-api), see [starknet.js](https://www.starknetjs.com/).

# Installation

```
$ npm i starknet-devnet
```

# Compatibility

This library is compatible with stable Devnet versions in the inclusive range: `v0.1.1`-`v0.1.2`.

[Devnet's balance checking functionality](https://0xspaceshard.github.io/starknet-devnet-rs/docs/balance#check-balance) is not provided in this library because it is simply replaceable using starknet.js, as witnessed by the [getAccountBalance function](./test/util.ts#L57)

# Usage

## Spawn a new Devnet

This library allows you to spawn a Devnet instance inside your script, without a separate terminal. It finds a free random free port, and releases all used resources on exit.

### Spawn a version without manual installation

Assuming your machine has a supported OS (macOS or Linux) and supported architecture (arm64/aarch64 or x64/x86_64), using `Devnet.spawnVersion` will quickly install and spawn a new Devnet.

```typescript
import { Devnet } from "starknet-devnet";

async function main() {
    // Specify anything from https://github.com/0xSpaceShard/starknet-devnet-rs/releases
    // Be sure to include the 'v' if it's in the version name.
    const devnet = await Devnet.spawnVersion("v0.1.2");
    console.log(await devnet.provider.isAlive()); // true
}
```

To use the latest version:

```typescript
const devnet = await Devnet.spawnVersion("latest");
```

### Spawn an already installed Devnet

Assuming you have already installed Devnet and it is present in your environment's `PATH`, simply run:

```typescript
const devnet = await Devnet.spawnDefaultCommand();
```

### Specify Devnet arguments

You can use the same CLI arguments you would pass to a Devnet running in a terminal:

```typescript
const devnet = await Devnet.spawnVersion("v0.1.2", { args: ["--predeployed-accounts", "3"] });
```

### Redirect the output

By default, the spawned Devnet inherits the output streams of the main JS program in which it is invoked. If you invoke your program in a terminal without any stream redirections, it will print Devnet logs in that same terminal together with your program output. This can be overriden:

```typescript
import fs from "fs";
const outputStream = fs.createWriteStream("devnet-out.txt");
const devnet = await Devnet.spawnVersion("v0.1.2", {
    stdout: outputStream,
    stderr: ...,
});
// do stuff with devnet and then close the stream
outputStream.end();
```

### Spawn a custom build

If you have a custom build of Devnet or have multiple custom versions present locally:

```typescript
// provide the command
const devnet = await Devnet.spawnCommand("my-devnet-command");
// or specify the path
const devnet = await Devnet.spawnCommand("/path/to/my-devnet-command");
```

## Connect to a running instance

If there already is a running Devnet instance (e.g. in another terminal or in another JS/TS program), you can simply connect to it by importing `DevnetProvider`. [Read more about different ways of running Devnet](https://0xspaceshard.github.io/starknet-devnet-rs/docs/category/running).

```typescript
import { DevnetProvider } from "starknet-devnet";

async function helloDevnet() {
    const devnet = new DevnetProvider(); // accepts an optional configuration object
    console.log(await devnet.isAlive()); // true
}
```

## L1-L2 communication

Assuming there is an L1 provider running (e.g. [anvil](https://github.com/foundry-rs/foundry/tree/master/crates/anvil)), use the `postman` property of `DevnetProvider` to achieve [L1-L2 communication](https://0xspaceshard.github.io/starknet-devnet-rs/docs/postman). See [this example](https://github.com/0xSpaceShard/starknet-devnet-js/blob/master/test/postman.test.ts) for more info.

## Examples

See the [`test` directory](https://github.com/0xSpaceShard/starknet-devnet-js/tree/master/test) for more usage examples.

## Contribute

If you spot a problem or room for improvement, check if an issue for it [already exists](https://github.com/0xSpaceShard/starknet-devnet-js/issues). If not, [create a new one](https://github.com/0xSpaceShard/starknet-devnet-js/issues/new). You are welcome to open a PR yourself to close the issue. Once you open a PR, you will see a template with a list of steps - please follow them.

### Test

Before running the tests with `npm test`, follow the steps defined in the [CI/CD config file](.circleci/config.yml). If your new test relies on environment variables, load them with `getEnvVar`. Conversely, to find all environment variables that need to be set before running existing tests, search the repo for `getEnvVar`.
