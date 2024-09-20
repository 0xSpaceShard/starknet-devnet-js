#!/bin/bash

set -euo pipefail

PORT=9876

# This is a test of Devnet-wrapper's keepAlive flag, provided on spawning.

# To ensure the artifacts expected by `require`.
npm run build

node -e 'require("./dist/devnet").Devnet.spawnVersion("latest", { args: ["--port", "'${PORT}'"] })'
curl -sSfL localhost:${PORT}/is_alive || echo "Ok... expected to be unresponsive"

node -e 'require("./dist/devnet").Devnet.spawnVersion("latest", { args: ["--port", "'${PORT}'"], keepAlive: true })'
curl -sSfL localhost:${PORT}/is_alive && echo "Ok... expected to be responsive"

lsof -i :${PORT} | awk 'NR==2{print $2}' | xargs kill
curl -sSfL localhost:${PORT}/is_alive || echo "Ok... expected to be unresponsive"
