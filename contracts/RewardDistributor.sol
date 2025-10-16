// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MeeChainNFT.sol";
import "./MissionTracker.sol";

/**
 * @title RewardDistributor
 * @dev Distributes rewards when missions are completed
 */
contract RewardDistributor is Ownable {
    MeeChainNFT public nftContract;
    MissionTracker public missionTracker;
    
    // Reward types
    enum RewardType { NFT, UNLOCK_CONTENT, BOTH }
    
    // Reward structure
    struct Reward {
        RewardType rewardType;
        string ipfsURI;  // IPFS URI for NFT reward or unlocked content
        uint256 missionId;  // Associated mission ID
        bool isActive;
    }
    
    // Mapping from reward ID to Reward
    mapping(uint256 => Reward) public rewards;
    
    // Mapping from user to claimed rewards
    mapping(address => mapping(uint256 => bool)) public claimedRewards;
    
    // Events
    event RewardCreated(uint256 indexed rewardId, RewardType rewardType, uint256 missionId);
    event RewardClaimed(address indexed user, uint256 indexed rewardId, uint256 missionId);
    event ContentUnlocked(address indexed user, uint256 indexed missionId, string ipfsURI);
    event NFTRewardMinted(address indexed user, uint256 indexed tokenId, uint256 missionId);
    
    constructor(address _nftContract, address _missionTracker) Ownable(msg.sender) {
        nftContract = MeeChainNFT(_nftContract);
        missionTracker = MissionTracker(_missionTracker);
    }
    
    /**
     * @dev Create a new reward
     * @param rewardId Unique reward identifier
     * @param rewardType Type of reward (NFT, UNLOCK_CONTENT, or BOTH)
     * @param ipfsURI IPFS URI for the reward
     * @param missionId Associated mission ID
     */
    function createReward(
        uint256 rewardId,
        RewardType rewardType,
        string memory ipfsURI,
        uint256 missionId
    ) external onlyOwner {
        require(rewards[rewardId].missionId == 0, "Reward already exists");
        
        rewards[rewardId] = Reward({
            rewardType: rewardType,
            ipfsURI: ipfsURI,
            missionId: missionId,
            isActive: true
        });
        
        emit RewardCreated(rewardId, rewardType, missionId);
    }
    
    /**
     * @dev Claim a reward after completing a mission
     * @param rewardId Reward ID to claim
     */
    function claimReward(uint256 rewardId) external {
        Reward memory reward = rewards[rewardId];
        require(reward.missionId != 0, "Reward does not exist");
        require(reward.isActive, "Reward is not active");
        require(!claimedRewards[msg.sender][rewardId], "Reward already claimed");
        
        // Verify mission completion
        require(
            missionTracker.hasMissionCompleted(msg.sender, reward.missionId),
            "Mission not completed"
        );
        
        claimedRewards[msg.sender][rewardId] = true;
        
        // Distribute reward based on type
        if (reward.rewardType == RewardType.NFT || reward.rewardType == RewardType.BOTH) {
            uint256 tokenId = nftContract.mintCard(msg.sender, reward.ipfsURI, reward.missionId);
            emit NFTRewardMinted(msg.sender, tokenId, reward.missionId);
        }
        
        if (reward.rewardType == RewardType.UNLOCK_CONTENT || reward.rewardType == RewardType.BOTH) {
            emit ContentUnlocked(msg.sender, reward.missionId, reward.ipfsURI);
        }
        
        emit RewardClaimed(msg.sender, rewardId, reward.missionId);
    }
    
    /**
     * @dev Trigger reward distribution automatically when mission is completed
     * @param user User who completed the mission
     * @param missionId Completed mission ID
     * @param rewardId Reward to distribute
     */
    function triggerReward(address user, uint256 missionId, uint256 rewardId) external onlyOwner {
        Reward memory reward = rewards[rewardId];
        require(reward.missionId == missionId, "Reward mission mismatch");
        require(reward.isActive, "Reward is not active");
        require(!claimedRewards[user][rewardId], "Reward already claimed");
        
        // Verify mission completion
        require(
            missionTracker.hasMissionCompleted(user, missionId),
            "Mission not completed"
        );
        
        claimedRewards[user][rewardId] = true;
        
        // Distribute reward based on type
        if (reward.rewardType == RewardType.NFT || reward.rewardType == RewardType.BOTH) {
            uint256 tokenId = nftContract.mintCard(user, reward.ipfsURI, reward.missionId);
            emit NFTRewardMinted(user, tokenId, missionId);
        }
        
        if (reward.rewardType == RewardType.UNLOCK_CONTENT || reward.rewardType == RewardType.BOTH) {
            emit ContentUnlocked(user, missionId, reward.ipfsURI);
        }
        
        emit RewardClaimed(user, rewardId, missionId);
    }
    
    /**
     * @dev Update reward active status
     * @param rewardId Reward ID to update
     * @param isActive New active status
     */
    function updateRewardStatus(uint256 rewardId, bool isActive) external onlyOwner {
        require(rewards[rewardId].missionId != 0, "Reward does not exist");
        rewards[rewardId].isActive = isActive;
    }
    
    /**
     * @dev Check if user has claimed a reward
     * @param user User address
     * @param rewardId Reward ID to check
     */
    function hasClaimedReward(address user, uint256 rewardId) external view returns (bool) {
        return claimedRewards[user][rewardId];
    }
}
