The release of a new version is done automatically if the version in `package.json` on `master` is different from the one in npm. If the semver you use is not of the form `/v?[0-9.]+$/` (notice the optional `v`), a pre-release will be made using dist-tag `beta`. Otherwise a dist-tag `latest` is used.

When adapting to a new starknet-devnet version, be sure to have replaced all occurrences of the previous version with the new one.

Simply follow these steps:

1. `$ git checkout master`

    - Using another branch is only acceptable if making a pre-release, but then the publishing script needs to be run manually (or the CI config file needs to be modified to include your branch).

2. `$ npm version <NEW_VERSION>`

    - This creates a commit and a tag for `<NEW_VERSION>`
    - See what `<NEW_VERSION>` can be [on this page](https://docs.npmjs.com/cli/v8/commands/npm-version).

3. `$ git push`

    - Once the change is pushed, the CI/CD pipeline will release the new version when all tests pass.

4. `$ git push origin v<NEW_VERSION>`

    - Notice how the tag name has the `v` prefix.

Avoid the automatic release process by adding `[skip ci]` to your commit message.
