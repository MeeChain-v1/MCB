const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MeeChain NFT Mission System", function () {
  let nftContract;
  let missionTracker;
  let rewardDistributor;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy NFT Contract
    const MeeChainNFT = await ethers.getContractFactory("MeeChainNFT");
    nftContract = await MeeChainNFT.deploy();
    await nftContract.waitForDeployment();

    // Deploy Mission Tracker
    const MissionTracker = await ethers.getContractFactory("MissionTracker");
    missionTracker = await MissionTracker.deploy(await nftContract.getAddress());
    await missionTracker.waitForDeployment();

    // Deploy Reward Distributor
    const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
    rewardDistributor = await RewardDistributor.deploy(
      await nftContract.getAddress(),
      await missionTracker.getAddress()
    );
    await rewardDistributor.waitForDeployment();
  });

  describe("MeeChainNFT", function () {
    it("Should mint an NFT with IPFS metadata", async function () {
      const ipfsURI = "ipfs://QmTest123";
      const missionId = 1;

      await expect(nftContract.mintCard(user1.address, ipfsURI, missionId))
        .to.emit(nftContract, "NFTMinted")
        .withArgs(user1.address, 0, ipfsURI, missionId);

      expect(await nftContract.ownerOf(0)).to.equal(user1.address);
      expect(await nftContract.tokenURI(0)).to.equal(ipfsURI);
      expect(await nftContract.tokenToMission(0)).to.equal(missionId);
    });

    it("Should return all tokens owned by an address", async function () {
      await nftContract.mintCard(user1.address, "ipfs://1", 1);
      await nftContract.mintCard(user1.address, "ipfs://2", 2);
      await nftContract.mintCard(user2.address, "ipfs://3", 3);

      const user1Tokens = await nftContract.tokensOfOwner(user1.address);
      expect(user1Tokens.length).to.equal(2);
      expect(user1Tokens[0]).to.equal(0);
      expect(user1Tokens[1]).to.equal(1);
    });

    it("Should update token URI", async function () {
      await nftContract.mintCard(user1.address, "ipfs://old", 1);
      const newURI = "ipfs://new";

      await expect(nftContract.updateTokenURI(0, newURI))
        .to.emit(nftContract, "MetadataUpdated")
        .withArgs(0, newURI);

      expect(await nftContract.tokenURI(0)).to.equal(newURI);
    });
  });

  describe("MissionTracker", function () {
    it("Should create a mission", async function () {
      const missionId = 1;
      const requiredCardIds = [1, 2, 3];
      const rewardAmount = 100;

      await expect(
        missionTracker.createMission(missionId, "Test Mission", requiredCardIds, rewardAmount)
      )
        .to.emit(missionTracker, "MissionCreated")
        .withArgs(missionId, "Test Mission", requiredCardIds);

      const mission = await missionTracker.getMission(missionId);
      expect(mission.id).to.equal(missionId);
      expect(mission.name).to.equal("Test Mission");
      expect(mission.isActive).to.be.true;
      expect(mission.rewardAmount).to.equal(rewardAmount);
    });

    it("Should check if wallet has required cards", async function () {
      // Create mission requiring cards from mission IDs 1 and 2
      await missionTracker.createMission(1, "Mission 1", [1, 2], 100);

      // Mint cards with mission IDs 1 and 2 to user1
      await nftContract.mintCard(user1.address, "ipfs://card1", 1);
      await nftContract.mintCard(user1.address, "ipfs://card2", 2);

      // User1 should have required cards
      expect(await missionTracker.hasRequiredCards(user1.address, 1)).to.be.true;

      // User2 should not have required cards
      expect(await missionTracker.hasRequiredCards(user2.address, 1)).to.be.false;
    });

    it("Should complete a mission when user has all required cards", async function () {
      // Create mission and mint required cards
      await missionTracker.createMission(1, "Mission 1", [1, 2], 100);
      await nftContract.mintCard(user1.address, "ipfs://card1", 1);
      await nftContract.mintCard(user1.address, "ipfs://card2", 2);

      // Complete mission
      await expect(missionTracker.connect(user1).completeMission(1))
        .to.emit(missionTracker, "MissionCompleted")
        .withArgs(user1.address, 1);

      expect(await missionTracker.hasMissionCompleted(user1.address, 1)).to.be.true;
    });

    it("Should not allow completing mission without required cards", async function () {
      await missionTracker.createMission(1, "Mission 1", [1, 2], 100);

      await expect(
        missionTracker.connect(user1).completeMission(1)
      ).to.be.revertedWith("Missing required cards");
    });
  });

  describe("RewardDistributor", function () {
    beforeEach(async function () {
      // Setup mission and complete it
      await missionTracker.createMission(1, "Mission 1", [1, 2], 100);
      await nftContract.mintCard(user1.address, "ipfs://card1", 1);
      await nftContract.mintCard(user1.address, "ipfs://card2", 2);
      await missionTracker.connect(user1).completeMission(1);
    });

    it("Should create a reward", async function () {
      await expect(
        rewardDistributor.createReward(1, 0, "ipfs://reward", 1) // RewardType.NFT = 0
      )
        .to.emit(rewardDistributor, "RewardCreated")
        .withArgs(1, 0, 1);
    });

    it("Should allow claiming NFT reward after mission completion", async function () {
      await rewardDistributor.createReward(1, 0, "ipfs://reward", 1); // RewardType.NFT = 0

      await expect(rewardDistributor.connect(user1).claimReward(1))
        .to.emit(rewardDistributor, "NFTRewardMinted")
        .and.to.emit(rewardDistributor, "RewardClaimed");

      expect(await rewardDistributor.hasClaimedReward(user1.address, 1)).to.be.true;
    });

    it("Should unlock content when claiming content reward", async function () {
      await rewardDistributor.createReward(2, 1, "ipfs://content", 1); // RewardType.UNLOCK_CONTENT = 1

      await expect(rewardDistributor.connect(user1).claimReward(2))
        .to.emit(rewardDistributor, "ContentUnlocked")
        .withArgs(user1.address, 1, "ipfs://content");
    });

    it("Should trigger both NFT and content for BOTH reward type", async function () {
      await rewardDistributor.createReward(3, 2, "ipfs://both", 1); // RewardType.BOTH = 2

      const tx = await rewardDistributor.connect(user1).claimReward(3);
      const receipt = await tx.wait();

      // Should emit both NFTRewardMinted and ContentUnlocked events
      const nftEvent = receipt.logs.find(log => {
        try {
          return rewardDistributor.interface.parseLog(log)?.name === "NFTRewardMinted";
        } catch {
          return false;
        }
      });
      const contentEvent = receipt.logs.find(log => {
        try {
          return rewardDistributor.interface.parseLog(log)?.name === "ContentUnlocked";
        } catch {
          return false;
        }
      });

      expect(nftEvent).to.not.be.undefined;
      expect(contentEvent).to.not.be.undefined;
    });

    it("Should not allow claiming reward without completing mission", async function () {
      await rewardDistributor.createReward(1, 0, "ipfs://reward", 1);

      await expect(
        rewardDistributor.connect(user2).claimReward(1)
      ).to.be.revertedWith("Mission not completed");
    });

    it("Should not allow claiming reward twice", async function () {
      await rewardDistributor.createReward(1, 0, "ipfs://reward", 1);
      await rewardDistributor.connect(user1).claimReward(1);

      await expect(
        rewardDistributor.connect(user1).claimReward(1)
      ).to.be.revertedWith("Reward already claimed");
    });
  });

  describe("Integration: Complete Mission Flow", function () {
    it("Should complete full mission flow from card minting to reward claiming", async function () {
      // 1. Create a mission
      await missionTracker.createMission(1, "Collect 3 Cards", [1, 2, 3], 200);

      // 2. Mint required cards to user
      await nftContract.mintCard(user1.address, "ipfs://card1", 1);
      await nftContract.mintCard(user1.address, "ipfs://card2", 2);
      await nftContract.mintCard(user1.address, "ipfs://card3", 3);

      // 3. Verify user has all required cards
      expect(await missionTracker.hasRequiredCards(user1.address, 1)).to.be.true;

      // 4. Complete mission
      await missionTracker.connect(user1).completeMission(1);
      expect(await missionTracker.hasMissionCompleted(user1.address, 1)).to.be.true;

      // 5. Create and claim reward
      await rewardDistributor.createReward(1, 0, "ipfs://legendary-card", 1);
      await rewardDistributor.connect(user1).claimReward(1);

      // 6. Verify user received the reward NFT
      const userTokens = await nftContract.tokensOfOwner(user1.address);
      expect(userTokens.length).to.equal(4); // 3 initial cards + 1 reward card
    });
  });
});
