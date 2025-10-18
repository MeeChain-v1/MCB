# MeeChain NFT Mission System - Visual Architecture

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MeeChain NFT Mission System                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   Frontend/Board UI  │
│  ┌────────────────┐  │
│  │ User Dashboard │  │
│  │ • View Cards   │  │
│  │ • Missions     │  │
│  │ • Rewards      │  │
│  └────────────────┘  │
└──────────┬───────────┘
           │ Web3 API Calls
           ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Smart Contract Layer                            │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  MeeChainNFT     │  │ MissionTracker   │  │RewardDistributor │  │
│  │  (ERC721)        │  │                  │  │                  │  │
│  │                  │  │                  │  │                  │  │
│  │ • mintCard()     │◄─┤ • createMission()│◄─┤ • createReward() │  │
│  │ • updateTokenURI │  │ • hasRequiredCards│  │ • claimReward()  │  │
│  │ • tokensOfOwner()│──►│ • completeMission│──►│ • triggerReward()│  │
│  │                  │  │                  │  │                  │  │
│  │ Events:          │  │ Events:          │  │ Events:          │  │
│  │ • NFTMinted      │  │ • MissionCreated │  │ • RewardClaimed  │  │
│  │ • MetadataUpdated│  │ • MissionComplete│  │ • NFTMinted      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│           │                      │                      │            │
└───────────┼──────────────────────┼──────────────────────┼────────────┘
            │                      │                      │
            ↓                      ↓                      ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Blockchain Event Log                            │
│  All transactions and events are permanently recorded on-chain       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         IPFS Storage Layer                           │
│                                                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │  Card Metadata │  │ Reward Content │  │ Unlocked Data  │        │
│  │  ipfs://QmXXX  │  │  ipfs://QmYYY  │  │  ipfs://QmZZZ  │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│           ↑                   ↑                   ↑                  │
└───────────┼───────────────────┼───────────────────┼──────────────────┘
            │                   │                   │
            └───────────────────┴───────────────────┘
                    Referenced by NFT tokenURIs
```

## Mission Completion Flow

```
Step 1: Card Collection
┌─────────────┐
│   User      │
│  Wallet     │──► Receives NFT Cards
└─────────────┘    (via MeeChainNFT.mintCard)
      │
      │ Has Cards:
      │ • Card #1 (Mission ID: 1)
      │ • Card #2 (Mission ID: 2)
      │ • Card #3 (Mission ID: 3)
      ↓

Step 2: Mission Check
┌─────────────────────────┐
│   MissionTracker        │
│  Mission #1 requires:   │
│  • Card from Mission 1  │──► hasRequiredCards(user, missionId)
│  • Card from Mission 2  │    → Returns true/false
│  • Card from Mission 3  │
└─────────────────────────┘
      │
      │ User has all required cards ✓
      ↓

Step 3: Complete Mission
┌─────────────────────────┐
│   User Action           │
│  completeMission(1)     │──► Validates requirements
└─────────────────────────┘    Emits MissionCompleted event
      │
      │ Mission completed successfully
      ↓

Step 4: Claim Reward
┌─────────────────────────┐
│   RewardDistributor     │
│  claimReward(rewardId)  │──► Validates mission completion
└─────────────────────────┘    Mints NFT or unlocks content
      │
      │ Reward distributed
      ↓

Step 5: Result
┌─────────────────────────┐
│   User Receives:        │
│  • New NFT Card         │
│  or                     │
│  • Unlocked Content     │
│  or                     │
│  • Both                 │
└─────────────────────────┘
```

## Contract Interaction Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT                                │
└──────────────────────────────────────────────────────────────────┘

1. Deploy MeeChainNFT
   │
   ├──► Get NFT Contract Address
   │
2. Deploy MissionTracker(nftAddress)
   │
   ├──► Get MissionTracker Address
   │
3. Deploy RewardDistributor(nftAddress, trackerAddress)
   │
   └──► Get RewardDistributor Address

┌──────────────────────────────────────────────────────────────────┐
│                      RUNTIME INTERACTIONS                         │
└──────────────────────────────────────────────────────────────────┘

Admin Setup:
┌────────────┐
│   Admin    │
└─────┬──────┘
      │
      ├──► nft.mintCard(user, ipfsURI, missionId)
      │    Creates cards for users
      │
      ├──► tracker.createMission(id, name, requiredCards, reward)
      │    Sets up mission requirements
      │
      └──► distributor.createReward(id, type, ipfsURI, missionId)
           Defines rewards for missions

User Journey:
┌────────────┐
│   User     │
└─────┬──────┘
      │
      ├──► nft.tokensOfOwner(userAddress)
      │    View owned cards
      │
      ├──► tracker.hasRequiredCards(userAddress, missionId)
      │    Check eligibility
      │
      ├──► tracker.completeMission(missionId)
      │    Complete mission
      │
      └──► distributor.claimReward(rewardId)
           Claim reward

Contract Calls:
┌─────────────────────┐
│ RewardDistributor   │
└──────────┬──────────┘
           │
           ├──► tracker.hasMissionCompleted(user, missionId)
           │    Verify mission completion
           │
           └──► nft.mintCard(user, ipfsURI, missionId)
                Mint reward NFT
```

## Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         EVENT FLOW                               │
└─────────────────────────────────────────────────────────────────┘

Event Emission:
┌─────────────────┐         ┌──────────────────┐
│ Smart Contract  │────────►│  Blockchain      │
│ Action Occurs   │  Emit   │  Event Log       │
└─────────────────┘  Event  └──────────────────┘
                                     │
                                     │ Subscribe
                                     ↓
                              ┌──────────────┐
                              │   Listener   │
                              │  (Frontend/  │
                              │   Backend)   │
                              └──────┬───────┘
                                     │
                                     ↓
                              ┌──────────────┐
                              │   Trigger    │
                              │   Action     │
                              │  • Update UI │
                              │  • Notify    │
                              │  • Automate  │
                              └──────────────┘

Key Events:
1. NFTMinted(user, tokenId, uri, missionId)
   → Update user's card collection UI

2. MissionCompleted(user, missionId)
   → Trigger reward availability notification

3. RewardClaimed(user, rewardId, missionId)
   → Update user's rewards UI

4. ContentUnlocked(user, missionId, ipfsURI)
   → Display unlocked content from IPFS
```

## Data Storage Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                      ON-CHAIN STORAGE                            │
└─────────────────────────────────────────────────────────────────┘

MeeChainNFT:
┌────────────────────────────────────────┐
│ tokenToMission: mapping(uint256 => uint256)
│ _nextTokenId: uint256
│ _tokenURIs: mapping(uint256 => string)  // From ERC721URIStorage
│ _owners: mapping(uint256 => address)    // From ERC721
└────────────────────────────────────────┘

MissionTracker:
┌────────────────────────────────────────┐
│ missions: mapping(uint256 => Mission)
│   Mission {
│     id, name, requiredCardIds[],
│     isActive, rewardAmount
│   }
│ completedMissions: mapping(address => mapping(uint256 => bool))
└────────────────────────────────────────┘

RewardDistributor:
┌────────────────────────────────────────┐
│ rewards: mapping(uint256 => Reward)
│   Reward {
│     rewardType, ipfsURI, missionId, isActive
│   }
│ claimedRewards: mapping(address => mapping(uint256 => bool))
└────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     OFF-CHAIN STORAGE (IPFS)                     │
└─────────────────────────────────────────────────────────────────┘

NFT Metadata:
{
  "name": "Card Name",
  "image": "ipfs://QmImageHash",
  "attributes": [...]
}

Stored at: ipfs://QmMetadataHash
Referenced in: NFT tokenURI
```

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                       ACCESS CONTROL                             │
└─────────────────────────────────────────────────────────────────┘

Owner (Admin):
┌──────────────┐
│   Owner      │
└──────┬───────┘
       │
       ├──► mintCard()              ✓ Allowed
       ├──► createMission()         ✓ Allowed
       ├──► createReward()          ✓ Allowed
       ├──► updateTokenURI()        ✓ Allowed
       ├──► updateMissionStatus()   ✓ Allowed
       └──► updateRewardStatus()    ✓ Allowed

Regular User:
┌──────────────┐
│    User      │
└──────┬───────┘
       │
       ├──► completeMission()       ✓ Allowed
       ├──► claimReward()           ✓ Allowed
       ├──► tokensOfOwner()         ✓ Allowed (view)
       ├──► hasRequiredCards()      ✓ Allowed (view)
       ├──► mintCard()              ✗ Denied
       ├──► createMission()         ✗ Denied
       └──► createReward()          ✗ Denied

Contracts:
┌──────────────────┐
│ RewardDistributor│
└──────┬───────────┘
       │
       └──► nft.mintCard()          ✓ Allowed (as owner)
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND INTEGRATION                          │
└─────────────────────────────────────────────────────────────────┘

User Interface:
┌─────────────────────┐
│  React/Vue/Angular  │
│                     │
│  Components:        │
│  • CardGallery      │◄──── nft.tokensOfOwner(user)
│  • MissionBoard     │◄──── tracker.getMission(id)
│  • RewardClaimer    │◄──── distributor.claimReward(id)
│                     │
│  Event Listeners:   │
│  • onNFTMinted      │◄──── NFTMinted event
│  • onMissionDone    │◄──── MissionCompleted event
│  • onRewardClaimed  │◄──── RewardClaimed event
└─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND INTEGRATION                           │
└─────────────────────────────────────────────────────────────────┘

Server Services:
┌─────────────────────┐
│  Node.js/Python/Go  │
│                     │
│  Services:          │
│  • Event Indexer    │◄──── Listen to all events
│  • Notification     │◄──── Trigger on MissionCompleted
│  • Analytics        │◄──── Track completion stats
│  • IPFS Uploader    │────► Upload metadata to IPFS
└─────────────────────┘
```

This visual documentation provides a comprehensive view of the system architecture, data flow, and integration points.
