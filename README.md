[![npm package](https://img.shields.io/npm/v/starknet-devnet?color=blue)](https://www.npmjs.com/package/starknet-devnet)

# Introduction

Using this JavaScript/TypeScript library, you can interact with [Starknet Devnet](https://github.com/0xSpaceShard/starknet-devnet-rs/) via its specific [Devnet API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#devnet-api). To interact with any Starknet node or network (including Starknet Devnet) via the [Starknet JSON-RPC API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#starknet-api), see [starknet.js](https://www.starknetjs.com/).

# Installation

```
$ npm i starknet-devnet
```

# Compatibility

This library is compatible with stable Devnet versions in the inclusive range: `v0.1.1`-`v0.1.2`.

[Devnet's balance checking functionality](https://0xspaceshard.github.io/starknet-devnet-rs/docs/balance#check-balance) is not provided in this library because it is simply replaceable using starknet.js, as witnessed in [the tests](./test/util.ts#L53)

# Usage

The main export of this package is `DevnetProvider`. Assuming you have a [running Devnet](https://0xspaceshard.github.io/starknet-devnet-rs/docs/category/running), simply import `DevnetProvider` in your JS/TS program and interact with the Devnet instance:

```typescript
import { DevnetProvider } from "starknet-devnet";

async function helloDevnet() {
    const devnet = new DevnetProvider(); // accepts an optional configuration object
    console.log(await devnet.isAlive()); // true
}
```

## L1-L2 communication

Assuming there is an L1 provider running (e.g. [anvil](https://github.com/foundry-rs/foundry/tree/master/crates/anvil)), use the `postman` property of `DevnetProvider` to achieve [L1-L2 communication](https://0xspaceshard.github.io/starknet-devnet-rs/docs/postman).

## Examples

See the [`test` directory](https://github.com/0xSpaceShard/starknet-devnet-js/tree/master/test) for usage examples.

## Contribute

If you spot a problem or room for improvement, check if an issue for it [already exists](https://github.com/0xSpaceShard/starknet-devnet-js/issues). If not, [create a new one](https://github.com/0xSpaceShard/starknet-devnet-js/issues/new). You are welcome to open a PR yourself to close the issue. Once you open a PR, you will see a template with a list of steps - please follow them.

### Test

Before running the tests with `npm test`, follow the steps defined in the [CI/CD config file](.circleci/config.yml). If your test relies on environment variables, load them with `getEnvVar`. Conversely, to find all environment variables that need to be set, search the repo for `getEnvVar`.
