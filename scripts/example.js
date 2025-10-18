const hre = require("hardhat");

/**
 * Example script demonstrating how to interact with the MeeChain Mission System
 * This shows the complete flow from deployment to reward claiming
 */

async function main() {
  console.log("Starting MeeChain Mission System Demo...\n");

  const [owner, user1, user2] = await hre.ethers.getSigners();
  console.log(`Owner: ${owner.address}`);
  console.log(`User1: ${user1.address}`);
  console.log(`User2: ${user2.address}\n`);

  // 1. Deploy Contracts
  console.log("=== Step 1: Deploying Contracts ===");
  
  const MeeChainNFT = await hre.ethers.getContractFactory("MeeChainNFT");
  const nftContract = await MeeChainNFT.deploy();
  await nftContract.waitForDeployment();
  const nftAddress = await nftContract.getAddress();
  console.log(`✓ MeeChainNFT deployed to: ${nftAddress}`);

  const MissionTracker = await hre.ethers.getContractFactory("MissionTracker");
  const missionTracker = await MissionTracker.deploy(nftAddress);
  await missionTracker.waitForDeployment();
  const trackerAddress = await missionTracker.getAddress();
  console.log(`✓ MissionTracker deployed to: ${trackerAddress}`);

  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(nftAddress, trackerAddress);
  await rewardDistributor.waitForDeployment();
  const distributorAddress = await rewardDistributor.getAddress();
  console.log(`✓ RewardDistributor deployed to: ${distributorAddress}\n`);

  // 2. Mint Initial Cards
  console.log("=== Step 2: Minting Initial Cards ===");
  
  const card1TX = await nftContract.mintCard(user1.address, "ipfs://QmCard1Hash", 1);
  await card1TX.wait();
  console.log(`✓ Minted Card #1 (Mission ID: 1) to User1`);

  const card2TX = await nftContract.mintCard(user1.address, "ipfs://QmCard2Hash", 2);
  await card2TX.wait();
  console.log(`✓ Minted Card #2 (Mission ID: 2) to User1`);

  const card3TX = await nftContract.mintCard(user1.address, "ipfs://QmCard3Hash", 3);
  await card3TX.wait();
  console.log(`✓ Minted Card #3 (Mission ID: 3) to User1`);

  // Verify user1 owns 3 cards
  const user1Tokens = await nftContract.tokensOfOwner(user1.address);
  console.log(`✓ User1 now owns ${user1Tokens.length} cards\n`);

  // 3. Create a Mission
  console.log("=== Step 3: Creating Mission ===");
  
  const missionTX = await missionTracker.createMission(
    1,                          // Mission ID
    "Complete Starter Set",     // Mission Name
    [1, 2, 3],                 // Required card mission IDs
    1000                        // Reward amount
  );
  await missionTX.wait();
  console.log(`✓ Created Mission #1: "Complete Starter Set"`);
  console.log(`  Required Cards: Mission IDs [1, 2, 3]`);
  console.log(`  Reward: 1000\n`);

  // 4. Check if User Has Required Cards
  console.log("=== Step 4: Validating Card Ownership ===");
  
  const hasCards = await missionTracker.hasRequiredCards(user1.address, 1);
  console.log(`✓ User1 has required cards: ${hasCards}`);
  
  const user2HasCards = await missionTracker.hasRequiredCards(user2.address, 1);
  console.log(`✓ User2 has required cards: ${user2HasCards}\n`);

  // 5. Complete Mission
  console.log("=== Step 5: Completing Mission ===");
  
  const completeTX = await missionTracker.connect(user1).completeMission(1);
  const completeReceipt = await completeTX.wait();
  console.log(`✓ User1 completed Mission #1`);
  console.log(`  Transaction: ${completeReceipt.hash}\n`);

  // 6. Create Reward
  console.log("=== Step 6: Creating Reward ===");
  
  const rewardTX = await rewardDistributor.createReward(
    1,                              // Reward ID
    0,                              // Reward Type: NFT
    "ipfs://QmLegendaryCardHash",   // IPFS URI for reward card
    1                               // Associated Mission ID
  );
  await rewardTX.wait();
  console.log(`✓ Created Reward #1 (NFT) for Mission #1`);
  console.log(`  Metadata: ipfs://QmLegendaryCardHash\n`);

  // 7. Claim Reward
  console.log("=== Step 7: Claiming Reward ===");
  
  const claimTX = await rewardDistributor.connect(user1).claimReward(1);
  const claimReceipt = await claimTX.wait();
  console.log(`✓ User1 claimed Reward #1`);
  console.log(`  Transaction: ${claimReceipt.hash}`);

  // Verify user1 now has 4 cards (3 initial + 1 reward)
  const finalTokens = await nftContract.tokensOfOwner(user1.address);
  console.log(`✓ User1 now owns ${finalTokens.length} cards (3 initial + 1 reward)\n`);

  // 8. Display Final State
  console.log("=== Final State ===");
  
  const mission = await missionTracker.getMission(1);
  console.log(`Mission #1 Status:`);
  console.log(`  Name: ${mission.name}`);
  console.log(`  Active: ${mission.isActive}`);
  console.log(`  Reward Amount: ${mission.rewardAmount}`);
  
  const isCompleted = await missionTracker.hasMissionCompleted(user1.address, 1);
  console.log(`\nUser1 Mission #1 Completed: ${isCompleted}`);
  
  const hasClaimedReward = await rewardDistributor.hasClaimedReward(user1.address, 1);
  console.log(`User1 Reward #1 Claimed: ${hasClaimedReward}`);

  console.log("\n=== Demo Complete ===");
  console.log("The MeeChain Mission System is working correctly!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
