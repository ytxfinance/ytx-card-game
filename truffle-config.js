const HdProvider = require("truffle-hdwallet-provider");
const path = require("path");
const mnemonic = 'series monitor book matrix employ wet hill very bottom matrix range milk'
const infuraKey = '87ac5f84d691494588f2162b15d1523d'

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      network_id: "*",
      port: 8545
    },
    ropsten: {
      provider: function () {
        return new HdProvider(
          mnemonic,
          `https://ropsten.infura.io/v3/${infuraKey}`
        );
      },
      network_id: 3,
      gas: 6e6,
      gasPrice: 30000000000, // 30 Gwei
      skipDryRun: true,
    }
  },
  compilers: {
    solc: {
      version: "0.5.10",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  mocha: {
    // enableTimeouts: false,
    // useColors: true,
  }
}
