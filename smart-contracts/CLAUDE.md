# FairStake Tickets - Web3 Lottery-Based Ticketing Platform

## Project Overview

**Purpose**: A Web3-first lottery ticketing platform that:
1. Fairly allocates limited tickets using verifiable randomness
2. Binds tickets to real owners with self-sovereign identity (World ID) to prevent scalping
3. Uses staking where buyers deposit funds during waiting window; non-winners receive rewards/rebates
4. Supports on-platform auctioned resale with blind bidding mechanism

---

## Core Features

### Ticket Classes
- **Class A**: ₹500 (Low tier)
- **Class B**: ₹1,000 (Mid tier)
- **Class C**: ₹2,000 (Premium tier)

### Flow Summary
1. Users join waiting pool per class and stake `facePrice + platformFee`
2. After registration window closes, system runs verifiable random draw
3. Winners mint identity-bound digital tickets
4. Non-winners receive rebate: `stake * (1 + r)` where r = reward rate
5. Resale only on-platform via blind (sealed-bid) auction

---

## Goals & Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Fairness** | Allocation by verifiable randomness (Pyth Entropy VRF) |
| **Anti-scalping** | Identity binding (World ID), KYC optional, CAPTCHA & rate limiting |
| **Transparency** | On-chain hashes of draw seeds for auditor verification |
| **User-friendly UX** | Simple registration, clear stake/refund mechanics, intuitive auction flow |
| **Economic sustainability** | Platform fees + commission fund rebates and operations |
| **Privacy** | Identity binding without exposing PII (ZK proofs + hash commitments) |

---

## System Actors

| Actor | Role |
|-------|------|
| **User/Fan** | Registers for pool, stakes funds |
| **Organizer** | Creates events, sets ticket counts, pricing, fee rules |
| **Platform** | Runs lottery, escrow, auction contracts; collects fees |
| **Oracle/VRF Provider** | Provides unbiased randomness (Pyth Entropy) |
| **Identity Provider** | World ID / BrightID for Proof-of-Personhood |

---

## Smart Contract Architecture

### Core Contracts

#### 5.1 EventManager
**Role**: Admin/Organizer functions
- Create events, set ticket classes, pricing, fee %, registration windows
- Manage supply counts

#### 5.2 StakingPool
**Role**: Per event or per pool escrow
- Accept stakes for entries
- Track entrants: `{poolId => [addresses, identityCommitments]}`
- Keep accounting for fees and escrowed capital
- Release funds for winners & rebates for losers

#### 5.3 LotteryEngine
**Role**: Draw management
- Request randomness from Pyth Entropy VRF
- Run deterministic selection algorithm (sorting + modulo arithmetic)
- Emit event logs and store selection commitments

#### 5.4 BoundTicketNFT
**Role**: Soulbound identity-bound tickets
- Mint ticket tokens to winners; enforce transfer rules
- Ticket metadata encrypted; decryption tied to owner's identity proof
- Standard: ERC-721 with soulbound extension / ERC-4973 style

#### 5.5 BlindAuction
**Role**: Blind auction for resale
- Implements commit-reveal sealed bids
- Locks ticket during auction
- Transfers funds upon successful auction

#### 5.6 RebateManager (Future)
**Role**: Non-winner compensation
- Calculate and distribute rebates to non-winners
- Use pre-defined formula and available fee pool to determine reward rate `r`

#### 5.7 IdentityVerifier
**Role**: Off-chain/On-chain identity glue
- Store hashed identity commitments
- Verify World ID ZK outputs before allowing registration or claim

---

## Ticket Lifecycle

### 1. Event Creation (Organizer)
- Define ticket classes A/B/C with quantities and face prices
- Set registration window, staking requirement, platform fee, rebate formula, auction rules

### 2. Registration & Staking
- User selects pool (A/B/C) and deposits: `stake = facePrice + platformFee`
- User supplies identity proof (World ID ZK-proof)
- Hashed identity commitment stored on-chain (no PII exposed)

### 3. Waiting Period
- System displays participant counts per pool
- Optional: show odds or percentile (avoid exact odds to prevent gambling classification)

### 4. Draw Trigger
- After window closes, platform requests randomness from Pyth Entropy
- Draw seed produced
- Winners selected deterministically using VRF seed

### 5. Allocation Notification
- Winners get claim window (e.g., 48 hrs) to claim ticket NFT
- Non-winners enter rebate processing

### 6. Ticket Issuance
- Ticket NFT minted to winner with transfer restrictions
- Options:
  - Soulbound (non-transferable)
  - Bound via identity (redeemable only when owner proves identity)
- NFT metadata contains encrypted event info

### 7. Rebates for Non-winners
- Formula: `rebate = stake * (1 + r)` where r based on demand/fee pool
- Example: Stake ₹500 → Receive ₹550 (10% rebate)
- Distribution: On-chain as PYUSD stablecoin

### 8. On-platform Resale (Optional)
- Seller lists ticket for auction; ticket locked in AuctionContract
- **Commit phase**: Bidders submit `commit = H(bidAmount || salt) + deposit`
- **Reveal phase**: Bidders reveal `(bidAmount, salt)`; contract validates
- Highest revealed bidder wins
- Funds transfer: `sellerReceives = bid - platformFee`
- Buyer must pass identity binding check before ticket transfer

---

## Economics & Fee Model

### Parameters
- `P` = face price per ticket (varies per pool)
- `F` = platform fee per entry (flat or %)
- `N` = number of entrants in pool
- `Q` = quantity of tickets in pool
- **Staked capital** = `N * (P + F)`

### Allocation
- **Winners**: Pay any additional charges and receive ticket
- **Non-winners**: Receive rebate or credit

### Rebate Formula
```
TotalFees = N * F
RebatePool = α * TotalFees + extraReserve
RebatePerLoser = RebatePool / (N - Q)
RebatePercent = (RebatePerLoser / P) - 1
```
*Example*: If `RebatePerLoser = 550` and `P = 500`, then `RebatePercent = 10%`

### Platform Sustainability
- Platform keeps `(1-α)` of fees + fixed commissions on resales
- Unsold tickets or unclaimed funds flow to future rebate pools

---

## Randomness & Fairness

### Implementation
- Use **Pyth Entropy VRF** to obtain unpredictable randomness
- Publish VRF response and selection algorithm for third-party verification
- Deterministic selection steps:
  1. Sort by `identityCommitment` hash
  2. Pick indices via `% poolSize` iterations

---

## Identity Binding & Privacy

### World ID Integration
- Obtain ZK proof that participant is unique human without revealing identity
- Store only hash commitment on-chain:
  ```
  commitment = H(userAddress || worldIdNullifier || eventId)
  ```
- Ticket ownership requires proving same identity nullifier when claiming/using ticket

### Privacy Guarantees
- **No PII on-chain** - KYC data stays off-chain with secure storage
- Identity proofs use zero-knowledge proofs

---

## Data Models

### On-chain
```solidity
struct Event {
    uint256 eventId;
    address organizer;
    Pool[] pools;
    uint256 registrationStart;
    uint256 registrationEnd;
    bytes32 vrfRequestId;
    State state;
}

struct Pool {
    uint256 poolId;
    uint256 price;
    uint256 quantity;
    uint256 entrantsCount;
    bytes32 entrantsCommitmentsHash;
}

mapping(uint256 => Entry) entries;
struct Entry {
    address participantAddress;
    bytes32 identityCommitment;
    uint256 stakeAmount;
}
```

### Off-chain
- KYC vault (if used)
- Encrypted metadata storage (IPFS + access control)
- Audit logs and analytics

---

## Integration Points

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **VRF Oracle** | Pyth Entropy | Verifiable randomness for draws |
| **Identity** | World ID / BrightID | Proof-of-Personhood |
| **Payments** | PYUSD (ERC-20) | Stablecoin for stakes/refunds/auctions |
| **Storage** | IPFS | Encrypted metadata with key delivery on claim |
| **Notifications** | Off-chain backend | Email/SMS for allocation results |

---

## Solidity Interface Examples

### ITicketNFT
```solidity
interface ITicketNFT {
    function mintBoundTicket(
        address to,
        uint256 eventId,
        uint256 poolId,
        bytes calldata encryptedMeta
    ) external;

    function transferWithIdentity(
        address from,
        address to,
        bytes calldata identityProof
    ) external;
}
```

### IStakingPool
```solidity
interface IStakingPool {
    function enterPool(
        uint256 eventId,
        uint256 poolId,
        bytes calldata identityCommitment
    ) external payable;

    function refundLoser(address user) external;
}
```

### IAuction
```solidity
interface IAuction {
    function commitBid(bytes32 commitment) external payable;
    function revealBid(uint256 amount, bytes32 salt) external;
}
```

---

## Security Considerations

| Risk | Mitigation |
|------|-----------|
| **Randomness attack** | Use secure Pyth Entropy VRF; avoid revealable seeds pre-draw |
| **Sybil attacks** | World ID reduces risk; optional KYC for VIP tiers |
| **Private key theft** | Recommend hardware wallets; enforce claim windows with identity checks |
| **Front-running / MEV** | Design selection/reveal carefully; use commit-reveal for auctions |
| **Regulatory risk** | Frame as allocation for purchase (not gambling); consult legal counsel |

---

## Deployment Strategy

### Testnet (Current Phase)
- Deploy to Sepolia testnet
- Verify contracts on Etherscan
- Test all contract interactions

### Libraries
- OpenZeppelin (access control, ERC standards, security utilities)

---

## Implementation Roadmap

### MVP (6-8 weeks) - Current Phase
- [ ] Event creation and pool registration
- [ ] Staking pool contract
- [ ] Simple off-chain random draw with published seed
- [ ] Basic rebate distribution
- [ ] Minting soulbound tickets
- [ ] Integrate World ID for uniqueness proofs

### v1 (3 months)
- [ ] Pyth Entropy VRF integration
- [ ] On-chain deterministic selection
- [ ] Sealed-bid auction contract
- [ ] On-chain rebate accounting
- [ ] UI polish and monitoring tools

### v2 (6+ months)
- [ ] Full KYC for VIP tiers
- [ ] Interoperable NFT standards
- [ ] Cross-event loyalty
- [ ] Secondary-market clearance house
- [ ] Gas optimization (Layer 2 deployment)

---

## Hackathon Partner Prize Integrations

### 1. Pyth Network ($2,000)
**Integration**: Pyth Entropy for verifiable randomness
- Use Pyth Entropy to generate random numbers during ticket allocation
- Randomly select winning users from each pool (A/B/C)
- Ensure fully on-chain, verifiable fairness
- Log random seeds for audits

**Bonus**: Use Pyth price feeds to dynamically adjust rebate multipliers based on crypto volatility

### 2. PayPal USD - PYUSD (Grand Prize)
**Integration**: Payment currency for entire platform
- Users stake using PYUSD
- Winners pay from staked PYUSD to claim tickets
- Losers receive PYUSD refunds + rewards
- Ticket resale/auction uses PYUSD bids

**Focus**: Consumer Champion UX - one-click payments, transparent refunds, gas abstraction

### 3. Yellow Network ($5,000)
**Integration**: State channels for auction system
- Use Yellow SDK for off-chain bidding
- Bidders open state channel, exchange bids off-chain
- Only settle winning bid on-chain
- Makes auctions fast, gas-efficient, and private

### 4. Hardhat 3 ($5,000)
**Integration**: Development framework
- Compile, test, and deploy all contracts
- Unit and integration tests
- Gas benchmarking with OP Stack simulation tools
- Coverage reports

### 5. ASI Alliance - Fetch.ai ($10,000)
**Integration**: Autonomous ticket agents
- Create "FairStake Agent" using Fetch.ai Agent SDK
- Agents automatically stake, monitor draws, bid in auctions
- Deploy on Agentverse with endpoints for:
  - registerUser
  - stakeFunds
  - participateInLottery
  - bidAuction
- Use MeTTa for reasoning over pricing trends

**10 Use Cases**:
1. Autonomous ticket agents (stake, monitor, claim)
2. AI negotiator agents (resale price negotiation)
3. Predictive demand modeling (oversubscription prediction)
4. Reward optimization (ML-based rebate calculation)
5. Fraud detection (fake accounts, duplicate identities)
6. AI-powered auctions (autonomous bidding)
7. Personalized recommendations (optimal pools)
8. Event data marketplace (Ocean Protocol)
9. Smart tickets with micro-agents (self-verifying NFTs)
10. AI governance assistant (DAO proposal optimization)

---

## KPIs & Success Metrics

- Allocation fairness score (audit passes + community verification)
- User satisfaction / NPS
- Fraud rate / disputed tickets count
- Average rebate % returned to losers
- Time to allocation (latency)
- Revenue split (platform fee vs rebates vs organizer)

---

## Open Questions

1. **Ticket transferability**: Soulbound (non-transferable) vs transferable NFTs gated by identity checks?
   - Tradeoff: resale flexibility vs scalping prevention

2. **Rebate pool allocation (α)**: Fixed percentage or dynamic based on demand?

3. **Fiat on-ramp**: Accept INR/UPI or use stablecoins only?

4. **Jurisdiction**: Regional or global operation? Compliance requirements?

---

## UX / Frontend Flow

1. Event page with pool counters and estimated odds
2. Registration widget with World ID proof flow embedded
3. Wallet integration (MetaMask/WalletConnect) for PYUSD staking
4. Notification center for allocation results
5. Auction UI with clear timers for commit/reveal phases
6. Simple claim/transfer UX requiring identity proof

---

## Project Structure

```
smart-contracts/
├── contracts/
│   ├── core/
│   │   ├── EventManager.sol
│   │   ├── LotteryEngine.sol
│   │   └── StakingPool.sol
│   ├── tokens/
│   │   └── BoundTicketNFT.sol
│   ├── marketplace/
│   │   └── BlindAuction.sol
│   ├── identity/
│   │   └── IdentityVerifier.sol
│   └── mocks/
├── scripts/
│   ├── deploy.ts
│   └── interact.ts
├── test/
│   └── FairStakeTickets.test.js
└── hardhat.config.ts
```
