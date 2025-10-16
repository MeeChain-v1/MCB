# MeeChain NFT Mission System - Technical Architecture

## Overview

The MeeChain NFT Mission System implements a modular blockchain architecture for managing NFT-based mission completion and reward distribution. The system is designed to support gamification mechanics where users collect NFT cards, complete missions, and earn rewards.

## System Components

### 1. Smart Contract Layer

The system consists of three main smart contracts that work together:

#### A. MeeChainNFT (NFT Minting)
- **Type**: ERC721 token with URI storage
- **Responsibility**: Manage NFT lifecycle and metadata
- **Key Features**:
  - Mint NFT cards with IPFS metadata URIs
  - Associate each card with a mission ID
  - Support dynamic metadata updates
  - Query tokens by owner

#### B. MissionTracker (Mission Management)
- **Type**: Validation and tracking contract
- **Responsibility**: Define and validate mission requirements
- **Key Features**:
  - Create missions with card requirements
  - Validate wallet ownership of required cards
  - Track mission completion status
  - Activate/deactivate missions

#### C. RewardDistributor (Reward Distribution)
- **Type**: Reward management contract
- **Responsibility**: Handle reward creation and distribution
- **Key Features**:
  - Create rewards linked to missions
  - Support multiple reward types (NFT, Content, Both)
  - Prevent duplicate claims
  - Trigger automatic or manual distribution

### 2. IPFS Metadata Layer

All NFT metadata is stored on IPFS for decentralization and immutability:

```json
{
  "name": "Card Name",
  "description": "Card description",
  "image": "ipfs://QmImageHash",
  "attributes": [
    {
      "trait_type": "Mission",
      "value": "Mission Name"
    },
    {
      "trait_type": "Rarity",
      "value": "Rare"
    }
  ]
}
```

### 3. Wallet Layer

Users interact with the system through their Ethereum wallets:
- View owned NFT cards
- Check mission eligibility
- Complete missions
- Claim rewards

### 4. Board UI Layer (Integration Point)

Frontend applications can integrate with the system through:
- Contract ABIs for direct interaction
- Event listeners for real-time updates
- View functions for state queries

## Data Flow

### Mission Completion Flow

```
1. User Collects Cards
   └─> NFTs minted to user's wallet via MeeChainNFT

2. Check Mission Requirements
   └─> Frontend queries MissionTracker.hasRequiredCards()

3. Complete Mission
   └─> User calls MissionTracker.completeMission()
   └─> Event: MissionCompleted emitted

4. Claim Reward
   └─> User calls RewardDistributor.claimReward()
   └─> If NFT reward: MeeChainNFT.mintCard() called
   └─> Events: NFTRewardMinted and/or ContentUnlocked emitted

5. Chain Event Log
   └─> All events logged on blockchain
   └─> Frontend/Backend can listen and react
```

## Contract Interactions

### Deployment Dependencies
```
1. Deploy MeeChainNFT
   ↓
2. Deploy MissionTracker(nftAddress)
   ↓
3. Deploy RewardDistributor(nftAddress, trackerAddress)
```

### Permission Model
- **Owner**: Can mint cards, create missions, create rewards
- **Users**: Can complete missions, claim rewards
- **Contracts**: RewardDistributor can mint NFTs via MeeChainNFT

## Event System

### Chain Event Log

All major actions emit events that can be monitored:

| Contract | Event | Purpose |
|----------|-------|---------|
| MeeChainNFT | NFTMinted | Track new card creation |
| MeeChainNFT | MetadataUpdated | Track metadata changes |
| MissionTracker | MissionCreated | Track new missions |
| MissionTracker | MissionCompleted | Trigger rewards |
| MissionTracker | MissionUpdated | Track status changes |
| RewardDistributor | RewardCreated | Track new rewards |
| RewardDistributor | RewardClaimed | Track claims |
| RewardDistributor | NFTRewardMinted | Track NFT rewards |
| RewardDistributor | ContentUnlocked | Trigger content access |

### Event-Driven Architecture

The system supports event-driven workflows:

```javascript
// Listen for mission completion
missionTracker.on("MissionCompleted", async (user, missionId) => {
  console.log(`User ${user} completed mission ${missionId}`);
  // Trigger reward distribution
  await rewardDistributor.triggerReward(user, missionId, rewardId);
});

// Listen for content unlock
rewardDistributor.on("ContentUnlocked", async (user, missionId, ipfsURI) => {
  console.log(`Unlocking content for user ${user}`);
  // Update frontend to show unlocked content from IPFS
  displayContent(ipfsURI);
});
```

## Scalability Considerations

### Gas Optimization
- Optimized loops in `hasRequiredCards()` and `tokensOfOwner()`
- Efficient storage patterns using mappings
- Events for off-chain indexing

### Modular Design
Each contract can be upgraded independently:
- New mission types: Update MissionTracker
- New reward types: Update RewardDistributor
- New NFT features: Update MeeChainNFT

### Off-Chain Components
- IPFS for metadata storage (reduces on-chain storage costs)
- Event indexing for fast queries (The Graph, etc.)
- Frontend state management for user experience

## Security Features

### Access Control
- OpenZeppelin's Ownable for admin functions
- Function modifiers for permission checks
- Owner-only minting and configuration

### Validation
- Mission existence checks
- Card ownership verification
- Duplicate claim prevention
- Active status validation

### State Management
- Completion tracking per user per mission
- Claim tracking per user per reward
- Token ownership via ERC721 standard

## Integration Guide

### For Frontend Developers

1. **Connect to Contracts**
```javascript
const nft = new ethers.Contract(nftAddress, nftABI, provider);
const tracker = new ethers.Contract(trackerAddress, trackerABI, provider);
const distributor = new ethers.Contract(distributorAddress, distributorABI, provider);
```

2. **Display User's Cards**
```javascript
const tokens = await nft.tokensOfOwner(userAddress);
const cards = await Promise.all(
  tokens.map(async (tokenId) => {
    const uri = await nft.tokenURI(tokenId);
    const missionId = await nft.tokenToMission(tokenId);
    return { tokenId, uri, missionId };
  })
);
```

3. **Check Mission Eligibility**
```javascript
const canComplete = await tracker.hasRequiredCards(userAddress, missionId);
```

4. **Complete Mission & Claim Reward**
```javascript
// Complete mission
const tx1 = await tracker.connect(signer).completeMission(missionId);
await tx1.wait();

// Claim reward
const tx2 = await distributor.connect(signer).claimReward(rewardId);
await tx2.wait();
```

### For Backend Developers

1. **Monitor Events**
```javascript
tracker.on("MissionCompleted", (user, missionId, event) => {
  // Update database
  // Send notifications
  // Trigger automated rewards
});
```

2. **Batch Operations**
```javascript
// Mint cards to multiple users
for (const user of users) {
  await nft.mintCard(user.address, user.ipfsURI, user.missionId);
}
```

3. **Admin Dashboard**
```javascript
// Create mission
await tracker.createMission(id, name, requiredCards, reward);

// Create reward
await distributor.createReward(id, type, ipfsURI, missionId);
```

## Testing Strategy

The system includes comprehensive tests:

1. **Unit Tests**: Individual contract functions
2. **Integration Tests**: Cross-contract interactions
3. **End-to-End Tests**: Complete mission flows
4. **Edge Cases**: Invalid inputs, permissions, duplicates

Run tests:
```bash
npm test
```

## Deployment Checklist

- [ ] Deploy contracts in correct order
- [ ] Verify contracts on block explorer
- [ ] Transfer ownership to multisig (production)
- [ ] Create initial missions
- [ ] Create initial rewards
- [ ] Test with small amounts first
- [ ] Monitor events and gas usage
- [ ] Document contract addresses

## Future Enhancements

### Possible Extensions
1. **Multi-chain Support**: Deploy on multiple chains
2. **Staking Mechanism**: Stake cards for rewards
3. **Trading System**: Peer-to-peer card trading
4. **Dynamic Missions**: Time-based or condition-based missions
5. **Leaderboards**: Track top completers
6. **Team Missions**: Collaborative mission completion
7. **Card Upgrades**: Merge or level up cards
8. **Reputation System**: Track user achievements

## Support and Resources

- **Documentation**: This file and README.md
- **Examples**: See `scripts/example.js`
- **Tests**: See `test/MissionSystem.test.js`
- **Deployment**: See `scripts/deploy.js`

For questions and issues, please refer to the GitHub repository.
