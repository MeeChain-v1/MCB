# Quick Start Guide - MeeChain NFT Mission System

This guide will help you get started with the MeeChain NFT Mission System in 5 minutes.

## Prerequisites

- Node.js 16+ installed
- Basic knowledge of Ethereum and Solidity
- Metamask or similar Web3 wallet (for testnet deployment)

## Installation

```bash
# Clone the repository
git clone https://github.com/MeeChain-v1/MCB.git
cd MCB

# Install dependencies
npm install
```

## Local Development

### 1. Start Local Blockchain

```bash
# Terminal 1 - Start Hardhat node
npm run node
```

This will start a local Ethereum network and display 20 test accounts with private keys.

### 2. Deploy Contracts

```bash
# Terminal 2 - Deploy to local network
npm run deploy:localhost
```

You should see output like:
```
MeeChainNFT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
MissionTracker deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
RewardDistributor deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

### 3. Run Example Script

```bash
# Terminal 2 - Run the example
npm run example
```

This demonstrates the complete flow:
- Minting cards
- Creating missions
- Completing missions
- Claiming rewards

## Testing

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

Expected output:
```
  MeeChain NFT Mission System
    MeeChainNFT
      ✓ Should mint an NFT with IPFS metadata
      ✓ Should return all tokens owned by an address
      ✓ Should update token URI
    MissionTracker
      ✓ Should create a mission
      ✓ Should check if wallet has required cards
      ✓ Should complete a mission when user has all required cards
      ...
```

## Basic Usage

### Mint NFT Cards

```javascript
const { ethers } = require("hardhat");

// Get contract instance
const nft = await ethers.getContractAt("MeeChainNFT", nftAddress);

// Mint a card
await nft.mintCard(
  userAddress,
  "ipfs://QmYourMetadataHash",
  1  // mission ID
);
```

### Create a Mission

```javascript
const tracker = await ethers.getContractAt("MissionTracker", trackerAddress);

// Create mission requiring 3 cards
await tracker.createMission(
  1,                    // mission ID
  "Starter Quest",      // name
  [1, 2, 3],           // required card mission IDs
  100                   // reward amount
);
```

### Complete Mission

```javascript
// Check if user can complete
const canComplete = await tracker.hasRequiredCards(userAddress, 1);

if (canComplete) {
  // Complete the mission
  await tracker.connect(userSigner).completeMission(1);
}
```

### Claim Reward

```javascript
const distributor = await ethers.getContractAt("RewardDistributor", distributorAddress);

// Create reward
await distributor.createReward(
  1,                             // reward ID
  0,                             // RewardType.NFT
  "ipfs://QmRewardCardHash",     // IPFS URI
  1                              // mission ID
);

// User claims reward
await distributor.connect(userSigner).claimReward(1);
```

## Frontend Integration

### Setup Web3 Provider

```javascript
import { ethers } from 'ethers';

// Connect to Metamask
const provider = new ethers.providers.Web3Provider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = provider.getSigner();

// Contract instances
const nft = new ethers.Contract(nftAddress, nftABI, signer);
const tracker = new ethers.Contract(trackerAddress, trackerABI, signer);
const distributor = new ethers.Contract(distributorAddress, distributorABI, signer);
```

### Display User's Cards

```javascript
async function getUserCards(userAddress) {
  const tokens = await nft.tokensOfOwner(userAddress);
  
  const cards = await Promise.all(
    tokens.map(async (tokenId) => {
      const uri = await nft.tokenURI(tokenId);
      const missionId = await nft.tokenToMission(tokenId);
      return { tokenId, uri, missionId };
    })
  );
  
  return cards;
}
```

### Listen to Events

```javascript
// Listen for mission completion
tracker.on("MissionCompleted", (user, missionId) => {
  console.log(`User ${user} completed mission ${missionId}`);
  // Update UI, show notification, etc.
});

// Listen for reward claims
distributor.on("RewardClaimed", (user, rewardId, missionId) => {
  console.log(`User ${user} claimed reward ${rewardId}`);
  // Update UI, refresh user's cards, etc.
});
```

## IPFS Integration

### Upload Metadata to IPFS

```javascript
// Using ipfs-http-client
import { create } from 'ipfs-http-client';

const client = create({ url: 'https://ipfs.infura.io:5001/api/v0' });

// Prepare metadata
const metadata = {
  name: "Legendary Dragon Card",
  description: "A powerful dragon card earned from completing the Dragon Quest",
  image: "ipfs://QmImageHash",
  attributes: [
    { trait_type: "Rarity", value: "Legendary" },
    { trait_type: "Power", value: "100" }
  ]
};

// Upload to IPFS
const { cid } = await client.add(JSON.stringify(metadata));
const ipfsURI = `ipfs://${cid}`;

// Use URI when minting
await nft.mintCard(userAddress, ipfsURI, missionId);
```

### Fetch Metadata from IPFS

```javascript
async function getMetadata(ipfsURI) {
  // Convert ipfs:// to HTTPS gateway
  const url = ipfsURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
  
  const response = await fetch(url);
  const metadata = await response.json();
  
  return metadata;
}
```

## Common Patterns

### Check Mission Eligibility

```javascript
async function canUserCompleteMission(userAddress, missionId) {
  // Check if already completed
  const completed = await tracker.hasMissionCompleted(userAddress, missionId);
  if (completed) return false;
  
  // Check if has required cards
  const hasCards = await tracker.hasRequiredCards(userAddress, missionId);
  
  return hasCards;
}
```

### Complete Mission and Claim Reward

```javascript
async function completeMissionFlow(missionId, rewardId) {
  try {
    // Step 1: Complete mission
    const tx1 = await tracker.connect(signer).completeMission(missionId);
    await tx1.wait();
    console.log("Mission completed!");
    
    // Step 2: Claim reward
    const tx2 = await distributor.connect(signer).claimReward(rewardId);
    await tx2.wait();
    console.log("Reward claimed!");
    
    return true;
  } catch (error) {
    console.error("Error:", error.message);
    return false;
  }
}
```

### Get Mission Details

```javascript
async function getMissionInfo(missionId) {
  const mission = await tracker.getMission(missionId);
  
  return {
    id: mission.id.toNumber(),
    name: mission.name,
    requiredCards: mission.requiredCardIds.map(id => id.toNumber()),
    isActive: mission.isActive,
    rewardAmount: mission.rewardAmount.toNumber()
  };
}
```

## Troubleshooting

### Issue: Contracts not compiling

**Solution**: The network may block Solidity compiler downloads. The contracts are verified to compile with solc 0.8.20. Try:
```bash
npm install --save-dev solc@0.8.20
```

### Issue: Transaction fails with "Missing required cards"

**Solution**: Verify the user owns all required cards:
```bash
# Check user's tokens
await nft.tokensOfOwner(userAddress);

# Check mission requirements
await tracker.getMission(missionId);
```

### Issue: "Mission already completed"

**Solution**: Each user can only complete a mission once. Check completion status:
```bash
await tracker.hasMissionCompleted(userAddress, missionId);
```

### Issue: "Reward already claimed"

**Solution**: Each reward can only be claimed once per user. Check claim status:
```bash
await distributor.hasClaimedReward(userAddress, rewardId);
```

## Next Steps

1. **Read the Architecture**: See `ARCHITECTURE.md` for detailed technical documentation
2. **Explore Tests**: Check `test/MissionSystem.test.js` for more examples
3. **Deploy to Testnet**: Modify deployment script for Sepolia or Goerli
4. **Build Frontend**: Use the integration examples above
5. **Add Features**: Extend contracts for your specific use case

## Useful Commands

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Start local node
npm run node

# Deploy to local network
npm run deploy:localhost

# Run example
npm run example
```

## Getting Help

- Check `README.md` for overview
- Read `ARCHITECTURE.md` for technical details
- See `DIAGRAMS.md` for visual architecture
- Review `VERIFICATION.md` for security info
- Open an issue on GitHub for bugs

## Quick Reference

### Contract Addresses (Local)
After running `npm run deploy:localhost`, you'll see addresses like:
```
MeeChainNFT: 0x5FbDB...
MissionTracker: 0xe7f17...
RewardDistributor: 0x9fE46...
```

Save these for frontend integration!

### Reward Types
- `0` = NFT only
- `1` = Content unlock only
- `2` = Both NFT and content unlock

### Test Accounts
Hardhat provides 20 test accounts. The first is the deployer/owner:
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Happy coding! 🚀
