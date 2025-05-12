# Arb Revow - Blockchain Commitment Registry

## Project Overview

Arb Revow is a Web3 decentralized application (dApp) developed to register on-chain commitments on the Arbitrum Sepolia network. The project allows users to register and verify revenue or token sharing commitments, creating an immutable and transparent record on the blockchain.

## Arb Revow Objective

The main objective of Arb Revow is to provide a reliable and transparent platform for registering financial commitments, allowing entrepreneurs, investors, and collaborators to document revenue or token sharing agreements in a public and verifiable way. This creates a trusted environment for business relationships and investments, especially in early-stage and Web3 projects.

## How It Works

The Arb Revow workflow can be summarized in the following steps:

1. **Wallet Connection**: The user connects their Web3 wallet (MetaMask) to the application
2. **Pledge Registration**: The user fills out a form with the commitment details
3. **IPFS Storage**: The complete data is stored on IPFS, generating a unique hash
4. **On-Chain Registration**: A transaction is sent to the RevowRegistry smart contract on the Arbitrum Sepolia network
5. **Attestation (optional)**: The user can choose to create an additional attestation using the local Arb Revow Attestations system
6. **Visualization**: Registered commitments can be viewed by anyone with access to the application

## System Architecture

The Arb Revow architecture consists of several interconnected components:

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|  Frontend React   |<--->|  Web3 Provider   |<--->|  Arbitrum Sepolia |
|                   |     |  (MetaMask)      |     |  (Smart Contract) |
+-------------------+     +-------------------+     +-------------------+
         ^                                                   ^
         |                                                   |
         v                                                   v
+-------------------+                               +-------------------+
|                   |                               |                   |
|  IPFS Storage     |                               |  Local Storage    |
|  (Metadata)       |                               |  (Attestations)   |
|                   |                               |                   |
+-------------------+                               +-------------------+
```

### Main Components:

1. **Frontend React**: User interface developed in React with Tailwind CSS
2. **Web3 Provider**: Integration with Web3 wallets through MetaMask
3. **Smart Contract**: RevowRegistry contract deployed on the Arbitrum Sepolia network
4. **IPFS Storage**: Decentralized storage for complete pledge metadata
5. **Local Storage**: Local attestation system for additional verification and validation

### Data Flow:

1. The user interacts with the React frontend
2. The frontend communicates with the Web3 Provider to sign transactions
3. Complete data is sent to IPFS
4. The IPFS hash and essential data are registered in the smart contract
5. Optionally, a local attestation is created and stored
6. Data is retrieved from the contract, IPFS, and local storage when needed

## Smart Contract Details

### Name: RevowRegistry

The RevowRegistry contract is the central component of Arb Revow, responsible for storing and managing commitment records on the blockchain.

### Fields and Structure

```solidity
enum CommitmentType { Revenue, Token }

struct Pledge {
    address pledgor;
    bytes32 projectName;
    bytes32 location;
    CommitmentType commitmentType;
    uint8 percentage;
    uint256 startDate;
    string ipfsHash;
    uint256 timestamp;
}
```

### Emitted Events

```solidity
event PledgeRegistered(
    address indexed pledgor,
    bytes32 projectName,
    bytes32 location,
    CommitmentType commitmentType,
    uint8 percentage,
    uint256 startDate,
    string ipfsHash,
    uint256 timestamp
);
```

### Main Functions

```solidity
// Registers a new pledge in the contract
function registerPledge(
    bytes32 projectName,
    bytes32 location,
    CommitmentType commitmentType,
    uint8 percentage,
    uint256 startDate,
    string calldata ipfsHash
) external;

// Returns all pledges from a specific address
function getPledgesByAddress(address pledgor) external view returns (Pledge[] memory);

// Returns all pledges registered in the contract
function getAllPledges() external view returns (Pledge[] memory);
```

## Frontend

### Technologies Used

- **React**: JavaScript framework for building the interface
- **Tailwind CSS**: CSS framework for styling
- **Ethers.js**: Library for interacting with the Ethereum/Arbitrum blockchain
- **React Router**: Route management in the application
- **LocalStorage API**: Local storage for attestations

### Main Screens and Features

1. **Home**: Landing page with project overview
2. **Register Pledge**: Form for registering new commitments
3. **My Pledges**: List of commitments registered by the connected user
4. **All Pledges**: List of all commitments registered in the contract
5. **Attestations**: Centralized view of all attestations in the system
6. **Attestation View**: Detailed page to view individual attestation

### How to Connect, Register, and View a Pledge

1. **Connection**:
   - Click the "Connect Wallet" button in the top right corner
   - Authorize the connection in MetaMask

2. **Registration**:
   - Navigate to "Register Pledge"
   - Fill out the form with commitment details
   - Click "Register Pledge"
   - Confirm the transaction in MetaMask

3. **Viewing**:
   - Navigate to "My Pledges" to see your commitments
   - Click "View Details" to see detailed information
   - Optionally, create an attestation by clicking "Create Arb Revow Attestation"
   - View all attestations in the system by navigating to "Attestations"

## IPFS Storage

### What is Stored

The complete pledge metadata is stored on IPFS, including:

- Project name
- Location
- Commitment type (Revenue or Token)
- Percentage
- Start date
- Detailed description
- Additional information
- Pledgor address
- Timestamp

### How Data Retrieval Works

1. The IPFS hash is stored in the smart contract
2. When the user views a pledge, the application:
   - Retrieves the IPFS hash from the contract
   - Fetches the complete metadata from IPFS using that hash
   - Combines the on-chain data with the IPFS metadata
   - Displays the complete information in the interface

### Fallback Strategies Used

To ensure data availability even in case of failures, Arb Revow implements the following fallback strategies:

1. **Local Cache**: IPFS data is cached locally after the first retrieval
2. **Multiple Gateways**: The application tries different IPFS gateways in case of failure
3. **On-Chain Data**: Essential information is kept directly on the blockchain

## Attestation System

### Local Attestation System

Arb Revow implements a local attestation system that works independently without relying on external services. This system:

1. Generates unique UIDs for each attestation
2. Stores complete data in the browser's localStorage
3. Allows verification and validation of attestations
4. Provides permanent links for viewing attestations
5. Centralizes all attestations in a dedicated page for easy access

## Recent Updates

### New Features

1. **Attestations Page**: Added a centralized page to view all attestations in the system
2. **UI Improvements**: Translated the entire application to English for international use
3. **Simplified Registration**: Removed unused file upload functionality
4. **Enhanced Storage**: Improved the local storage system for better data organization

## How to Run the Project

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/arb-revow.git
cd arb-revow

# Install dependencies
npm install
```

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```
REACT_APP_CONTRACT_ADDRESS=0xD6420C904fCd3834f8339941B27eA41Ed770cCDD
REACT_APP_CHAIN_ID=421614
REACT_APP_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/[YOUR_KEY]
REACT_APP_IPFS_PROJECT_ID=[YOUR_INFURA_PROJECT]
REACT_APP_IPFS_PROJECT_SECRET=[YOUR_INFURA_SECRET_KEY]
```

### Contract Deployment Command

```bash
# Compile the contract
npx hardhat compile

# Deploy to Arbitrum Sepolia testnet
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

### How to Run the Frontend

```bash
# Start the development server
npm start

# Access the application at http://localhost:3000
```

## Network Information

- **Contract Address**: 0xD6420C904fCd3834f8339941B27eA41Ed770cCDD
- **Network**: Arbitrum Sepolia
- **Chain ID**: 421614
- **Public RPC**: https://arb-sepolia.g.alchemy.com/v2/[YOUR_KEY]

## License

This project is open-source and is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 Arb Revow

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The "Revow" brand is a protected trademark and its use is subject to prior authorization.
