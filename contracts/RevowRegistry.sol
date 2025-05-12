// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract RevowRegistry {
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

    mapping(address => Pledge[]) private pledgesByAddress;
    Pledge[] private allPledges;

    function registerPledge(
        bytes32 projectName,
        bytes32 location,
        CommitmentType commitmentType,
        uint8 percentage,
        uint256 startDate,
        string calldata ipfsHash
    ) external {
        uint256 ts = block.timestamp;
        Pledge memory pledge = Pledge(
            msg.sender,
            projectName,
            location,
            commitmentType,
            percentage,
            startDate,
            ipfsHash,
            ts
        );
        pledgesByAddress[msg.sender].push(pledge);
        allPledges.push(pledge);
        emit PledgeRegistered(
            msg.sender,
            projectName,
            location,
            commitmentType,
            percentage,
            startDate,
            ipfsHash,
            ts
        );
    }

    function getPledgesByAddress(address pledgor) external view returns (Pledge[] memory) {
        return pledgesByAddress[pledgor];
    }

    function getAllPledges() external view returns (Pledge[] memory) {
        return allPledges;
    }
}
