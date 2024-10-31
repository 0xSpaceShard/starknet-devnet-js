[![npm package](https://img.shields.io/npm/v/starknet-devnet?color=blue)](https://www.npmjs.com/package/starknet-devnet)

# Introduction

Using this JavaScript/TypeScript library, you can spawn [Starknet Devnet](https://github.com/0xSpaceShard/starknet-devnet-rs/) without installing and running it in a separate terminal. You can interact with it via its specific [Devnet API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#devnet-api). To interact with any Starknet node or network (including Starknet Devnet) via the [Starknet JSON-RPC API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#starknet-api), see [starknet.js](https://www.starknetjs.com/).

# Installation

```
npm i starknet-devnet
```

# Compatibility

## Devnet compatibility

This library version is compatible with Devnet `v0.2.2`.

[Devnet's balance checking functionality](https://0xspaceshard.github.io/starknet-devnet-rs/docs/balance#check-balance) is not provided in this library because it is simply replaceable using starknet.js, as witnessed by the [getAccountBalance](./test/util.ts#L57) function.

## Environment compatibility

This library is intended for use with Node.js, not in a browser environment. In browsers, you can only use [`DevnetProvider`](#connect-to-a-running-instance) for connecting to an already running Devnet instance, but you cannot [spawn a new Devnet](#spawn-a-new-devnet), because that relies on modules not present in the browser engine.

To enable the use of `DevnetProvider` in browser, you need to configure sources for modules otherwise reported as not found. See [this issue](https://github.com/0xSpaceShard/starknet-devnet-js/issues/26) and [this SO answer](https://stackoverflow.com/a/51669301) for more info, but generally, if using webpack, it should be enough to populate a config file with the desired polyfill implementations or with `false` values.

# Usage

## Spawn a new Devnet

This library allows you to spawn a Devnet instance inside your program, without a separate terminal. It finds a random free port, and releases all used resources on exit. You can specify a port of your choice via `args: ["--port", ...]`.

### Spawn a version without manual installation

Assuming your machine has a supported OS (macOS or Linux) and supported architecture (arm64/aarch64 or x64/x86_64), using `Devnet.spawnVersion` will quickly install and spawn a new Devnet.

```typescript
import { Devnet } from "starknet-devnet";

async function main() {
    // Specify anything from https://github.com/0xSpaceShard/starknet-devnet-rs/releases
    // Be sure to include the 'v' if it's in the version name.
    const devnet = await Devnet.spawnVersion("v0.2.2");
    console.log(await devnet.provider.isAlive()); // true
}
```

To use the latest compatible version:

```typescript
const devnet = await Devnet.spawnVersion("latest");
```

### Spawn an already installed Devnet

Assuming you have already installed Devnet and it is present in your environment's `PATH`, simply run:

```typescript
const devnet = await Devnet.spawnInstalled();
```

### Specify Devnet arguments

You can use the same CLI arguments you would pass to a Devnet running in a terminal:

```typescript
const devnet = await Devnet.spawnInstalled({ args: ["--predeployed-accounts", "3"] });
```

### Devnet output

By default, the spawned Devnet inherits the output streams of the main program in which it is invoked. If you invoke your program in a terminal without any stream redirections, it will print Devnet logs in that same terminal together with your program output. This can be overriden:

```typescript
const outputStream = fs.createWriteStream("devnet-out.txt");
await events.once(outputStream, "open"); // necessary if specifying a --port, otherwise omissible
const devnet = await Devnet.spawnInstalled({
    stdout: outputStream,
    stderr: /* what you will, could be the same as stdout */,
});
// do stuff with devnet and then close the stream
outputStream.end();
```

To track the output in a separate terminal, open a new terminal and run:

```
tail -f devnet-out.txt
```

To ignore the output completely, specify `{ stdout: "ignore", stderr: "ignore" }`.

### Spawn a custom build

If you have a custom build of Devnet or have multiple custom versions present locally:

```typescript
// provide the command
const devnet = await Devnet.spawnCommand("my-devnet-command", { ... });
// or specify the path
const devnet = await Devnet.spawnCommand("/path/to/my-devnet-command", { ... });
```

### Killing

By default, the Devnet subprocess automatically exits and releases the used resources on program end, but you can send it a signal if needed:

```typescript
const devnet = await Devnet.spawnInstalled();
devnet.kill(...); // defaults to SIGTERM
```

### Keeping alive

To keep the spawned Devnet alive after your program exits, set the `keepAlive` flag:

```typescript
const devnet = await Devnet.spawnInstalled({ keepAlive: true });
```

In that case, you must take care of the spawned process after the program exits. To kill it, you need to:

1. Know the port it is using. It is logged on Devnet startup and is also a part of `devnet.provider.url`.
2. Kill the process using the port, which you can do:

    a. In JS, by relying on the [cross-port-killer library](https://www.npmjs.com/package/cross-port-killer).

    b. From shell, by executing `lsof -i :<PORT> | awk 'NR==2{print $2}' | xargs kill` (substitute `<PORT>` with yours).

## Connect to a running instance

If there already is a running Devnet instance (e.g. in another terminal or in another JS/TS program), you can simply connect to it by importing `DevnetProvider`. [Read more](https://0xspaceshard.github.io/starknet-devnet-rs/docs/category/running) about different ways of running Devnet.

```typescript
import { DevnetProvider } from "starknet-devnet";
const devnet = new DevnetProvider(); // accepts an optional configuration object
console.log(await devnet.isAlive()); // true
```

## Enabling Starknet API support

Since this library only supports the [Devnet-specific API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#devnet-api), to interact via [Starknet JSON-RPC API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#starknet-api), use [starknet.js](https://www.starknetjs.com/).

E.g. to get the latest block after spawning Devnet, you would need to do:

```typescript
import { Devnet } from "starknet-devnet";
import * as starknet from "starknet";

const devnet = await Devnet.spawnInstalled();
const starknetProvider = new starknet.RpcProvider({ nodeUrl: devnet.provider.url });

const block = await starknetProvider.getBlock("latest");
```

## L1-L2 communication

Assuming there is an L1 provider running (e.g. [anvil](https://github.com/foundry-rs/foundry/tree/master/crates/anvil)), use the `postman` property of `DevnetProvider` to achieve [L1-L2 communication](https://0xspaceshard.github.io/starknet-devnet-rs/docs/postman). See [this example](https://github.com/0xSpaceShard/starknet-devnet-js/blob/master/test/l1-l2-postman.test.ts) for more info.

## Examples

See the [`test` directory](https://github.com/0xSpaceShard/starknet-devnet-js/tree/master/test) for more usage examples.

## Contribute

If you spot a problem or room for improvement, check if an issue for it [already exists](https://github.com/0xSpaceShard/starknet-devnet-js/issues). If not, [create a new one](https://github.com/0xSpaceShard/starknet-devnet-js/issues/new). You are welcome to open a PR yourself to close the issue. Once you open a PR, you will see a template with a list of steps - please follow them.

### Test

Before running the tests with `npm test`, follow the steps defined in the [CI/CD config file](.circleci/config.yml). If your new test relies on environment variables, load them with `getEnvVar`. Conversely, to find all environment variables that need to be set before running existing tests, search the repo for `getEnvVar`.
