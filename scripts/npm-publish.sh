#!/bin/bash

set -euo pipefail

PACKAGE_NAME=$(jq -r ".name" package.json)
LOCAL_VERSION=$(jq -r ".version" package.json)

# If ordinary semver, publish as the "latest" release; otherwise make it a "beta" pre-release.
# Without this check, it would always default to releasing as "latest".
DIST_TAG=$(echo "$LOCAL_VERSION" | awk '/^v?[0-9.]+$/{ print "latest"; next; } { print "beta" }')
echo "The local version is \"$DIST_TAG\""

NPM_VERSION=$(npm view "$PACKAGE_NAME" dist-tags."$DIST_TAG")

if [ "$LOCAL_VERSION" = "$NPM_VERSION" ]; then
    echo "The \"$DIST_TAG\" npm version is equal to the local version: $LOCAL_VERSION. Increment to publish to npm."
else
    npm ci
    npm run build

    # NPM access token: https://docs.npmjs.com/creating-and-viewing-access-tokens
    npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}

    npm publish --verbose --access=public --tag="$DIST_TAG"
fi
