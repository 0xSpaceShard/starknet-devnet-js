The release of a new version is done automatically if the version in `package.json` on `master` is different from the one npm.

Simply follow these steps:

1. `$ git checkout master`

2. `$ npm version <NEW_VERSION>`

    - This creates a commit and a tag for `<NEW_VERSION>`
    - See what `<NEW_VERSION>` can be [on this page](https://docs.npmjs.com/cli/v8/commands/npm-version).

3. `$ git push`

    - Once the change is pushed, the CI/CD pipeline will release the new version when all tests pass.

4. `$ git push origin v<NEW_VERSION>`

    - Notice how the tag name has the `v` prefix.

Avoid the automatic release process by adding `[skip ci]` to your commit message.
