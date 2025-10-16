const hre = require("hardhat");

async function main() {
  console.log("Deploying MeeChain NFT Mission System...");

  // Deploy NFT Contract
  const MeeChainNFT = await hre.ethers.getContractFactory("MeeChainNFT");
  const nftContract = await MeeChainNFT.deploy();
  await nftContract.waitForDeployment();
  const nftAddress = await nftContract.getAddress();
  console.log(`MeeChainNFT deployed to: ${nftAddress}`);

  // Deploy Mission Tracker
  const MissionTracker = await hre.ethers.getContractFactory("MissionTracker");
  const missionTracker = await MissionTracker.deploy(nftAddress);
  await missionTracker.waitForDeployment();
  const missionTrackerAddress = await missionTracker.getAddress();
  console.log(`MissionTracker deployed to: ${missionTrackerAddress}`);

  // Deploy Reward Distributor
  const RewardDistributor = await hre.ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(nftAddress, missionTrackerAddress);
  await rewardDistributor.waitForDeployment();
  const rewardDistributorAddress = await rewardDistributor.getAddress();
  console.log(`RewardDistributor deployed to: ${rewardDistributorAddress}`);

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log(`NFT Contract: ${nftAddress}`);
  console.log(`Mission Tracker: ${missionTrackerAddress}`);
  console.log(`Reward Distributor: ${rewardDistributorAddress}`);

  console.log("\nNext steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Grant minting permissions to RewardDistributor contract");
  console.log("3. Create missions using MissionTracker.createMission()");
  console.log("4. Create rewards using RewardDistributor.createReward()");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
