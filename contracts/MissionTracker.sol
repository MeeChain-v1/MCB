// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MeeChainNFT.sol";

/**
 * @title MissionTracker
 * @dev Tracks mission requirements and validates wallet card ownership
 */
contract MissionTracker is Ownable {
    MeeChainNFT public nftContract;
    
    // Mission structure
    struct Mission {
        uint256 id;
        string name;
        uint256[] requiredCardIds;  // Required mission card IDs to complete this mission
        bool isActive;
        uint256 rewardAmount;
    }
    
    // Mapping from mission ID to Mission
    mapping(uint256 => Mission) public missions;
    
    // Mapping from wallet to completed missions
    mapping(address => mapping(uint256 => bool)) public completedMissions;
    
    // Events
    event MissionCreated(uint256 indexed missionId, string name, uint256[] requiredCardIds);
    event MissionCompleted(address indexed user, uint256 indexed missionId);
    event MissionUpdated(uint256 indexed missionId, bool isActive);
    
    constructor(address _nftContract) Ownable(msg.sender) {
        nftContract = MeeChainNFT(_nftContract);
    }
    
    /**
     * @dev Create a new mission
     * @param missionId Unique mission identifier
     * @param name Mission name
     * @param requiredCardIds Array of card IDs required to complete the mission
     * @param rewardAmount Reward amount for completing the mission
     */
    function createMission(
        uint256 missionId,
        string memory name,
        uint256[] memory requiredCardIds,
        uint256 rewardAmount
    ) external onlyOwner {
        require(missions[missionId].id == 0, "Mission already exists");
        
        missions[missionId] = Mission({
            id: missionId,
            name: name,
            requiredCardIds: requiredCardIds,
            isActive: true,
            rewardAmount: rewardAmount
        });
        
        emit MissionCreated(missionId, name, requiredCardIds);
    }
    
    /**
     * @dev Update mission active status
     * @param missionId Mission ID to update
     * @param isActive New active status
     */
    function updateMissionStatus(uint256 missionId, bool isActive) external onlyOwner {
        require(missions[missionId].id != 0, "Mission does not exist");
        missions[missionId].isActive = isActive;
        emit MissionUpdated(missionId, isActive);
    }
    
    /**
     * @dev Check if a wallet has all required cards for a mission
     * @param wallet Address to check
     * @param missionId Mission ID to verify
     */
    function hasRequiredCards(address wallet, uint256 missionId) public view returns (bool) {
        Mission memory mission = missions[missionId];
        require(mission.id != 0, "Mission does not exist");
        
        uint256[] memory userTokens = nftContract.tokensOfOwner(wallet);
        
        // Check if user has all required cards
        for (uint256 i = 0; i < mission.requiredCardIds.length; i++) {
            bool hasCard = false;
            for (uint256 j = 0; j < userTokens.length; j++) {
                uint256 cardMissionId = nftContract.tokenToMission(userTokens[j]);
                if (cardMissionId == mission.requiredCardIds[i]) {
                    hasCard = true;
                    break;
                }
            }
            if (!hasCard) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Complete a mission (can be called by user or authorized contracts)
     * @param missionId Mission ID to complete
     */
    function completeMission(uint256 missionId) external {
        Mission memory mission = missions[missionId];
        require(mission.id != 0, "Mission does not exist");
        require(mission.isActive, "Mission is not active");
        require(!completedMissions[msg.sender][missionId], "Mission already completed");
        require(hasRequiredCards(msg.sender, missionId), "Missing required cards");
        
        completedMissions[msg.sender][missionId] = true;
        emit MissionCompleted(msg.sender, missionId);
    }
    
    /**
     * @dev Get mission details
     * @param missionId Mission ID to query
     */
    function getMission(uint256 missionId) external view returns (
        uint256 id,
        string memory name,
        uint256[] memory requiredCardIds,
        bool isActive,
        uint256 rewardAmount
    ) {
        Mission memory mission = missions[missionId];
        require(mission.id != 0, "Mission does not exist");
        
        return (
            mission.id,
            mission.name,
            mission.requiredCardIds,
            mission.isActive,
            mission.rewardAmount
        );
    }
    
    /**
     * @dev Check if user has completed a mission
     * @param user User address
     * @param missionId Mission ID to check
     */
    function hasMissionCompleted(address user, uint256 missionId) external view returns (bool) {
        return completedMissions[user][missionId];
    }
}
