require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length === 64) 
        ? [process.env.PRIVATE_KEY] 
        : [],
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  // (Tùy chọn) verify contract trên Etherscan sau deploy
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};
