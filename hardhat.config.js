require('dotenv').config();
require('@nomiclabs/hardhat-ethers');

module.exports = {
  solidity: '0.8.24',
  networks: {
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614
    }
  }
};
