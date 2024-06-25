# Introduction

Using this JS client, you can interact with [Starknet Devnet](https://github.com/0xSpaceShard/starknet-devnet-rs/) via its specific [Devnet API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#devnet-api). To interact with any Starknet node or network (including Starknet Devnet) via the [Starknet JSON-RPC API](https://0xspaceshard.github.io/starknet-devnet-rs/docs/api#starknet-api), see [starknet.js](https://www.starknetjs.com/).

# Installation

```
$ npm i starknet-devnet-js
```

# Usage

The main export of this package is `DevnetClient`. Use its `postman` property to achieve [L1-L2 communication](https://0xspaceshard.github.io/starknet-devnet-rs/docs/postman).

See the `test` directory for usage examples.
