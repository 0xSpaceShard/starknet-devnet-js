[![npm package](https://img.shields.io/npm/v/starknet-devnet?color=blue)](https://www.npmjs.com/package/starknet-devnet)

# Introduction

Using this JavaScript/TypeScript library, you can interact with [Starknet Devnet](https://github.com/0xSpaceShard/starknet-devnet-rs/) via its specific [Devnet API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#devnet-api). To interact with any Starknet node or network (including Starknet Devnet) via the [Starknet JSON-RPC API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#starknet-api), see [starknet.js](https://www.starknetjs.com/).

# Installation

```
$ npm i starknet-devnet
```

# Supported Devnet version

This library is compatible with Devnet versions starting from commit `81ed1109ce12283e0d18c72f80131e3b89df4efa`. Use this and later versions of Devnet by [installing from source](https://0xspaceshard.github.io/starknet-devnet-rs/docs/running/install#run-from-source) or [running with Docker](https://0xspaceshard.github.io/starknet-devnet-rs/docs/running/docker/).

# Usage

The main export of this package is `DevnetProvider`. Assuming you have a [running Devnet](https://0xspaceshard.github.io/starknet-devnet-rs/docs/category/running), simply import `DevnetProvider` in your JS/TS program and interact with the Devnet instance:

```typescript
import { DevnetProvider } from "starknet-devnet";

async function helloDevnet() {
    const devnet = new DevnetProvider();
    console.log(await devnet.isAlive()); // true
}
```

Assuming there is an L1 provider running (e.g. [anvil](https://github.com/foundry-rs/foundry/tree/master/crates/anvil)), use the `postman` property of `DevnetProvider` to achieve [L1-L2 communication](https://0xspaceshard.github.io/starknet-devnet-rs/docs/postman).

See the [`test` directory](https://github.com/0xSpaceShard/starknet-devnet-js/tree/master/test) for usage examples.

# TODO

More functionality coming soon.
