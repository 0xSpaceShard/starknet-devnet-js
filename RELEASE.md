The release of a new version is done automatically if the version in `package.json` is different from the one npm.

1. `$ git checkout master`

2. `$ npm version <NEW_VERSION>`

    - This creates a commit and a tag for the `<NEW_VERSION>`

3. `$ git push`

    - Once the change is pushed, the CI/CD pipeline will release the new version when all tests pass.

4. `$ git push origin v<NEW_VERSION>`

    - Notice how the tag name has the `v` prefix.
