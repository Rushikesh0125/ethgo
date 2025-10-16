import { expect } from "chai";
import { network } from "hardhat";

const POOL_CLASS = { A: 0, B: 1, C: 2 };

describe("FairStake Tickets - End-to-End Flow", function () {
  let ethers: any;
  let pyusd: any, entropy: any, eventManager: any, stakingPool: any, lotteryEngine: any, identityVerifier: any, ticketNFT: any, auction: any;
  let owner: any, organizer: any, user1: any, user2: any, user3: any, treasury: any;

  before(async function () {
    const connection = await network.connect();
    ethers = connection.ethers;
  });

  beforeEach(async function () {
    [owner, organizer, user1, user2, user3, treasury] = await ethers.getSigners();

    // Deploy Mock PYUSD
    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    pyusd = await MockPYUSD.deploy();
    await pyusd.waitForDeployment();

    // Deploy Mock Entropy
    const MockEntropy = await ethers.getContractFactory("MockEntropy");
    entropy = await MockEntropy.deploy();
    await entropy.waitForDeployment();

    // Deploy Core Contracts
    const EventManager = await ethers.getContractFactory("EventManager");
    eventManager = await EventManager.deploy();
    await eventManager.waitForDeployment();

    const IdentityVerifier = await ethers.getContractFactory("IdentityVerifier");
    identityVerifier = await IdentityVerifier.deploy();
    await identityVerifier.waitForDeployment();

    const StakingPool = await ethers.getContractFactory("StakingPool");
    stakingPool = await StakingPool.deploy(await pyusd.getAddress(), treasury.address);
    await stakingPool.waitForDeployment();

    const LotteryEngine = await ethers.getContractFactory("LotteryEngine");
    lotteryEngine = await LotteryEngine.deploy(await entropy.getAddress(), owner.address);
    await lotteryEngine.waitForDeployment();

    const BoundTicketNFT = await ethers.getContractFactory("BoundTicketNFT");
    ticketNFT = await BoundTicketNFT.deploy();
    await ticketNFT.waitForDeployment();

    const BlindAuction = await ethers.getContractFactory("BlindAuction");
    auction = await BlindAuction.deploy(await pyusd.getAddress(), treasury.address);
    await auction.waitForDeployment();

    // Wire up contracts
    await eventManager.setStakingPoolContract(await stakingPool.getAddress());
    await eventManager.setLotteryEngineContract(await lotteryEngine.getAddress());
    await eventManager.setIdentityVerifierContract(await identityVerifier.getAddress());

    await stakingPool.setEventManager(await eventManager.getAddress());
    await stakingPool.setIdentityVerifier(await identityVerifier.getAddress());

    await lotteryEngine.setEventManager(await eventManager.getAddress());
    await lotteryEngine.setStakingPool(await stakingPool.getAddress());

    await ticketNFT.setEventManager(await eventManager.getAddress());
    await ticketNFT.setIdentityVerifier(await identityVerifier.getAddress());
    await ticketNFT.setStakingPool(await stakingPool.getAddress());
    await ticketNFT.setAuctionContract(await auction.getAddress());

    await auction.setTicketNFT(await ticketNFT.getAddress());
    await auction.setIdentityVerifier(await identityVerifier.getAddress());

    // Setup identity whitelist
    await identityVerifier.addToWhitelist(user1.address);
    await identityVerifier.addToWhitelist(user2.address);
    await identityVerifier.addToWhitelist(user3.address);

    // Mint PYUSD to users
    await pyusd.mint(user1.address, ethers.parseUnits("10000", 6));
    await pyusd.mint(user2.address, ethers.parseUnits("10000", 6));
    await pyusd.mint(user3.address, ethers.parseUnits("10000", 6));
  });

  describe("1. Event Creation", function () {
    it("Should create an event with ticket pools", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const now = latestBlock!.timestamp;
      const registrationStart = now + 60;
      const registrationEnd = now + 3600;
      const claimDeadline = now + 7200;

      await eventManager.connect(organizer).createEvent(
        "Concert 2025",
        "ipfs://metadata",
        registrationStart,
        registrationEnd,
        claimDeadline,
        250,  // 2.5% platform fee
        3000  // 30% rebate alpha
      );

      const eventData = await eventManager.getEvent(0);
      expect(eventData.eventName).to.equal("Concert 2025");
      expect(eventData.organizer).to.equal(organizer.address);
    });

    it("Should configure ticket pools", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const now = latestBlock!.timestamp;
      await eventManager.connect(organizer).createEvent(
        "Concert 2025",
        "ipfs://metadata",
        now + 60,
        now + 3600,
        now + 7200,
        250,
        3000
      );

      // Configure Pool A
      await eventManager.connect(organizer).configurePool(
        0,
        POOL_CLASS.A,
        ethers.parseUnits("500", 6),  // 500 PYUSD
        10  // 10 tickets
      );

      // Configure Pool B
      await eventManager.connect(organizer).configurePool(
        0,
        POOL_CLASS.B,
        ethers.parseUnits("1000", 6),  // 1000 PYUSD
        5  // 5 tickets
      );

      const poolA = await eventManager.getPool(0, POOL_CLASS.A);
      expect(poolA.facePrice).to.equal(ethers.parseUnits("500", 6));
      expect(poolA.quantity).to.equal(10);
    });
  });

  describe("2. Registration & Staking", function () {
    let eventId: number;

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const now = latestBlock!.timestamp;
      await eventManager.connect(organizer).createEvent(
        "Concert 2025",
        "ipfs://metadata",
        now + 60,
        now + 3600,
        now + 7200,
        250,
        3000
      );
      eventId = 0;

      await eventManager.connect(organizer).configurePool(
        eventId,
        POOL_CLASS.A,
        ethers.parseUnits("500", 6),
        2  // Only 2 tickets
      );

      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
      await eventManager.connect(organizer).openRegistration(eventId);
    });

    it("Should allow users to stake and enter pool", async function () {
      const facePrice = ethers.parseUnits("500", 6);
      const platformFee = (facePrice * BigInt(250)) / BigInt(10000);
      const totalStake = facePrice + platformFee;

      // Approve PYUSD
      await pyusd.connect(user1).approve(await stakingPool.getAddress(), totalStake);

      // Enter pool
      await stakingPool.connect(user1).enterPool(eventId, POOL_CLASS.A, "0x");

      const userStakes = await stakingPool.getUserStakes(user1.address);
      expect(userStakes.length).to.equal(1);

      const stake = await stakingPool.getStake(userStakes[0]);
      expect(stake.user).to.equal(user1.address);
      expect(stake.stakeAmount).to.equal(totalStake);
    });

    it("Should prevent double registration", async function () {
      const facePrice = ethers.parseUnits("500", 6);
      const platformFee = (facePrice * BigInt(250)) / BigInt(10000);
      const totalStake = facePrice + platformFee;

      await pyusd.connect(user1).approve(await stakingPool.getAddress(), totalStake * BigInt(2));
      await stakingPool.connect(user1).enterPool(eventId, POOL_CLASS.A, "0x");

      await expect(
        stakingPool.connect(user1).enterPool(eventId, POOL_CLASS.A, "0x")
      ).to.be.revertedWithCustomError(stakingPool, "AlreadyStaked");
    });

    it("Should allow multiple users to enter", async function () {
      const facePrice = ethers.parseUnits("500", 6);
      const platformFee = (facePrice * BigInt(250)) / BigInt(10000);
      const totalStake = facePrice + platformFee;

      // User 1
      await pyusd.connect(user1).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user1).enterPool(eventId, POOL_CLASS.A, "0x");

      // User 2
      await pyusd.connect(user2).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user2).enterPool(eventId, POOL_CLASS.A, "0x");

      // User 3
      await pyusd.connect(user3).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user3).enterPool(eventId, POOL_CLASS.A, "0x");

      const poolStakes = await stakingPool.getEventPoolStakes(eventId, POOL_CLASS.A);
      expect(poolStakes.length).to.equal(3);
    });
  });

  describe("3. Lottery Draw", function () {
    let eventId: number;

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const now = latestBlock!.timestamp;
      await eventManager.connect(organizer).createEvent(
        "Concert 2025",
        "ipfs://metadata",
        now + 60,
        now + 3600,
        now + 7200,
        250,
        3000
      );
      eventId = 0;

      await eventManager.connect(organizer).configurePool(
        eventId,
        POOL_CLASS.A,
        ethers.parseUnits("500", 6),
        2  // Only 2 winners
      );

      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
      await eventManager.connect(organizer).openRegistration(eventId);

      // 3 users enter
      const facePrice = ethers.parseUnits("500", 6);
      const platformFee = (facePrice * BigInt(250)) / BigInt(10000);
      const totalStake = facePrice + platformFee;

      await pyusd.connect(user1).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user1).enterPool(eventId, POOL_CLASS.A, "0x");

      await pyusd.connect(user2).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user2).enterPool(eventId, POOL_CLASS.A, "0x");

      await pyusd.connect(user3).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user3).enterPool(eventId, POOL_CLASS.A, "0x");

      // Close registration
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      await eventManager.closeRegistration(eventId);
    });

    it("Should request and reveal VRF draw", async function () {
      const fee = await lotteryEngine.getDrawFee();

      // Request draw
      await lotteryEngine.requestDraw(eventId, POOL_CLASS.A, { value: fee });

      const drawRequest = await lotteryEngine.getDrawRequest(eventId, POOL_CLASS.A);
      expect(drawRequest.revealed).to.be.false;

      // Reveal draw
      await lotteryEngine.revealAndSelectWinners(eventId, POOL_CLASS.A);

      const winners = await lotteryEngine.getWinners(eventId, POOL_CLASS.A);
      expect(winners.length).to.equal(2);
    });

    it("Should mark winners correctly", async function () {
      const fee = await lotteryEngine.getDrawFee();

      await lotteryEngine.requestDraw(eventId, POOL_CLASS.A, { value: fee });
      await lotteryEngine.revealAndSelectWinners(eventId, POOL_CLASS.A);

      const winners = await lotteryEngine.getWinners(eventId, POOL_CLASS.A);

      // Check winner status
      const isUser1Winner = await stakingPool.isWinner(eventId, user1.address);
      const isUser2Winner = await stakingPool.isWinner(eventId, user2.address);
      const isUser3Winner = await stakingPool.isWinner(eventId, user3.address);

      const winnerCount = [isUser1Winner, isUser2Winner, isUser3Winner].filter(Boolean).length;
      expect(winnerCount).to.equal(2);
    });
  });

  describe("4. Ticket Minting & Claiming", function () {
    let eventId: number;
    let winners: any[];

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const now = latestBlock!.timestamp;
      await eventManager.connect(organizer).createEvent(
        "Concert 2025",
        "ipfs://metadata",
        now + 60,
        now + 3600,
        now + 7200,
        250,
        3000
      );
      eventId = 0;

      await eventManager.connect(organizer).configurePool(
        eventId,
        POOL_CLASS.A,
        ethers.parseUnits("500", 6),
        2
      );

      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
      await eventManager.connect(organizer).openRegistration(eventId);

      const facePrice = ethers.parseUnits("500", 6);
      const platformFee = (facePrice * BigInt(250)) / BigInt(10000);
      const totalStake = facePrice + platformFee;

      await pyusd.connect(user1).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user1).enterPool(eventId, POOL_CLASS.A, "0x");

      await pyusd.connect(user2).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user2).enterPool(eventId, POOL_CLASS.A, "0x");

      await pyusd.connect(user3).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user3).enterPool(eventId, POOL_CLASS.A, "0x");

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      await eventManager.closeRegistration(eventId);

      const fee = await lotteryEngine.getDrawFee();
      await lotteryEngine.requestDraw(eventId, POOL_CLASS.A, { value: fee });
      await lotteryEngine.revealAndSelectWinners(eventId, POOL_CLASS.A);
      await lotteryEngine.completeEventDraw(eventId);

      winners = await lotteryEngine.getWinners(eventId, POOL_CLASS.A);
    });

    it("Should mint ticket NFT to winner", async function () {
      const winner = winners[0];

      await ticketNFT.mintTicket(
        winner,
        eventId,
        POOL_CLASS.A,
        "ipfs://encrypted-metadata"
      );

      const tokenId = await ticketNFT.getUserTicket(eventId, winner);
      expect(tokenId).to.be.gt(0);

      const ticket = await ticketNFT.getTicket(tokenId);
      expect(ticket.eventId).to.equal(eventId);
      expect(ticket.originalOwner).to.equal(winner);
    });

    it("Should prevent non-winner from minting", async function () {
      // Find a loser
      let loser = user1.address;
      if (winners.includes(user1.address)) {
        loser = winners.includes(user2.address) ? user3.address : user2.address;
      }

      await expect(
        ticketNFT.mintTicket(
          loser,
          eventId,
          POOL_CLASS.A,
          "ipfs://encrypted-metadata"
        )
      ).to.be.revertedWithCustomError(ticketNFT, "NotWinner");
    });
  });

  describe("5. Refunds for Losers", function () {
    let eventId: number;

    beforeEach(async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const now = latestBlock!.timestamp;
      await eventManager.connect(organizer).createEvent(
        "Concert 2025",
        "ipfs://metadata",
        now + 60,
        now + 3600,
        now + 7200,
        250,
        3000
      );
      eventId = 0;

      await eventManager.connect(organizer).configurePool(
        eventId,
        POOL_CLASS.A,
        ethers.parseUnits("500", 6),
        1  // Only 1 winner
      );

      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
      await eventManager.connect(organizer).openRegistration(eventId);

      const facePrice = ethers.parseUnits("500", 6);
      const platformFee = (facePrice * BigInt(250)) / BigInt(10000);
      const totalStake = facePrice + platformFee;

      await pyusd.connect(user1).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user1).enterPool(eventId, POOL_CLASS.A, "0x");

      await pyusd.connect(user2).approve(await stakingPool.getAddress(), totalStake);
      await stakingPool.connect(user2).enterPool(eventId, POOL_CLASS.A, "0x");

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      await eventManager.closeRegistration(eventId);

      const fee = await lotteryEngine.getDrawFee();
      await lotteryEngine.requestDraw(eventId, POOL_CLASS.A, { value: fee });
      await lotteryEngine.revealAndSelectWinners(eventId, POOL_CLASS.A);
      await lotteryEngine.completeEventDraw(eventId);
    });

    it("Should refund loser with rebate", async function () {
      const userStakes = await stakingPool.getUserStakes(user2.address);
      const stake = await stakingPool.getStake(userStakes[0]);

      if (!stake.isWinner) {
        const balanceBefore = await pyusd.balanceOf(user2.address);
        await stakingPool.connect(user2).claimRefund(userStakes[0]);
        const balanceAfter = await pyusd.balanceOf(user2.address);

        // Should get face price back + rebate
        expect(balanceAfter).to.be.gt(balanceBefore);
      }
    });
  });
});
