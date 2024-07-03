const starknetDevnet = require(".");

(async function () {
    const devnet = new starknetDevnet.DevnetProvider();
    console.log("Is Devnet alive?", await devnet.isAlive());
})();
