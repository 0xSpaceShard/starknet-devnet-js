#!/bin/bash

set -euo pipefail

PACKAGE_NAME=$(jq -r ".name" package.json)
LOCAL_VERSION=$(jq -r ".version" package.json)
NPM_VERSION=$(npm view "$PACKAGE_NAME" dist-tags.latest)

if [ "$LOCAL_VERSION" = "$NPM_VERSION" ]; then
    echo "The latest npm version is equal to current package version ($LOCAL_VERSION). Increment to publish to npm."
else
    npm ci
    npm run build
    # NPM access token: https://docs.npmjs.com/creating-and-viewing-access-tokens
    npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}
    npm publish --verbose --access=public
fi
