require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');

require('dotenv').config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200000,
          },
        },
      },
    ],
  },
  networks: {
    mumbai: {
      url: ["https://matic-mumbai.chainstacklabs.com",
            "https://rpc.ankr.com/polygon_mumbai"][0],
      accounts: [process.env.MUMBAI_DEPLOYER],
      timeout: 2000000,
    },
    polygon: {
      url: process.env.POLYGON_PRIVATE_RPC_URL,
      accounts: [process.env.POLYGON_DEPLOYER],
      timeout: 20000000,
    }
  },
  etherscan: {
    apiKey: {
      polygon: process.env.ETHERSCAN_API_KEY,
      polygonMumbai: process.env.ETHERSCAN_API_KEY,
    }
  }
};
