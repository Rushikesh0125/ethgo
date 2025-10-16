# FairStake Tickets - Technical Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Contract Details](#contract-details)
3. [User Flows](#user-flows)
4. [Integration Guides](#integration-guides)
5. [Security Model](#security-model)

---

## System Architecture

### High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        EVENT MANAGER                              │
│  - Event lifecycle (Created → Registration → Drawing → Allocated) │
│  - Pool configuration (A/B/C ticket classes)                      │
│  - Timestamps and deadlines                                       │
└─────────────────────┬────────────────────────────────────────────┘
                      │
         ┌────────────┼────────────┬──────────────────┐
         │            │            │                  │
         ▼            ▼            ▼                  ▼
┌────────────┐ ┌─────────────┐ ┌──────────┐ ┌────────────────┐
│  IDENTITY  │ │   STAKING   │ │ LOTTERY  │ │   TICKET NFT   │
│  VERIFIER  │ │    POOL     │ │  ENGINE  │ │                │
└────────────┘ └─────────────┘ └──────────┘ └────────────────┘
      │              │              │                │
      │              │              │                │
      ▼              ▼              ▼                ▼
   World ID      PYUSD ERC20   Pyth Entropy    Soulbound NFT
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │BLIND AUCTION │
                                              │(Resale Only) │
                                              └──────────────┘
```

---

## Contract Details

### 1. EventManager.sol

**Purpose**: Central registry for all events and ticket pools

**Key Responsibilities**:
- Create events with metadata
- Configure ticket pools (A/B/C with price/quantity)
- Manage event state transitions
- Track allocation and registration windows

**State Machine**:
```
Created → Registration → Drawing → Allocated → Completed
                ↓
            Cancelled
```

**Key Functions**:
```solidity
function createEvent(
    string calldata eventName,
    string calldata eventMetadataURI,
    uint64 registrationStart,
    uint64 registrationEnd,
    uint64 claimDeadline,
    uint256 platformFeePercent,
    uint256 rebateAlpha
) external returns (uint256 eventId)

function configurePool(
    uint256 eventId,
    PoolClass poolClass,
    uint256 facePrice,
    uint256 quantity
) external

function openRegistration(uint256 eventId) external
function closeRegistration(uint256 eventId) external
```

**Events**:
```solidity
event EventCreated(uint256 indexed eventId, address indexed organizer, ...)
event PoolConfigured(uint256 indexed eventId, PoolClass indexed poolClass, ...)
event EventStateChanged(uint256 indexed eventId, EventState oldState, EventState newState)
```

---

### 2. StakingPool.sol

**Purpose**: Manages user stakes and PYUSD deposits

**Key Responsibilities**:
- Accept PYUSD stakes from users
- Track entrants per pool
- Distribute refunds + rebates to losers
- Hold winner stakes until event completion

**Economic Model**:
```
User Stake = Face Price + Platform Fee
Platform Fee = (Face Price × Platform Fee %)
Rebate Pool = (Total Fees × Rebate Alpha %)

For losers:
Refund = Face Price + (Rebate Pool / Number of Losers)

For winners:
Funds locked until organizer withdraws after event
```

**Key Functions**:
```solidity
function enterPool(
    uint256 eventId,
    PoolClass poolClass,
    bytes calldata identityProof
) external returns (uint256 stakeId)

function claimRefund(uint256 stakeId) external
function claimTicket(uint256 stakeId) external

// Admin
function setWinners(uint256 eventId, PoolClass poolClass, address[] calldata winners) external
function fundRebatePool(uint256 eventId, PoolClass poolClass) external
```

**Security Features**:
- ReentrancyGuard on all external calls
- SafeERC20 for PYUSD transfers
- Identity verification before staking
- One stake per user per event

---

### 3. LotteryEngine.sol

**Purpose**: Manages VRF draws and winner selection

**Integration**: Pyth Entropy for verifiable randomness

**Draw Flow**:
```
1. Request VRF:
   - Generate user commitment (secret)
   - Call entropy.request() with commitment
   - Receive sequence number

2. Reveal VRF:
   - Submit user random number
   - Entropy combines with provider randomness
   - Get final random seed

3. Select Winners:
   - Fetch all participants from StakingPool
   - Fisher-Yates shuffle with VRF seed
   - Select first N as winners
   - Notify StakingPool and EventManager
```

**Key Functions**:
```solidity
function requestDraw(
    uint256 eventId,
    PoolClass poolClass
) external payable returns (uint64 sequenceNumber)

function revealAndSelectWinners(
    uint256 eventId,
    PoolClass poolClass
) external

function completeEventDraw(uint256 eventId) external
```

**Randomness Guarantee**:
```solidity
// Deterministic shuffle
for (uint256 i = participantCount - 1; i > 0; i--) {
    uint256 j = uint256(keccak256(abi.encodePacked(randomSeed, i))) % (i + 1);
    // Swap participants[i] and participants[j]
}
```

---

### 4. IdentityVerifier.sol

**Purpose**: Sybil resistance via World ID or similar proof-of-personhood

**Identity Commitment**:
```
commitment = H(userAddress || worldIdNullifier || eventId)
```

**World ID Integration** (Production):
```solidity
IWorldID(worldIdRouter).verifyProof(
    root,
    groupId,
    abi.encodePacked(user).hashToField(),
    nullifierHash,
    abi.encodePacked(eventId).hashToField(),
    proof
);
```

**Testnet Mode**:
- Whitelist-based verification
- Mock nullifiers for testing
- Easy onboarding for demos

**Key Functions**:
```solidity
function registerIdentity(
    address user,
    uint256 eventId,
    bytes32 commitment,
    bytes calldata proof
) external

function verifyIdentity(address user, bytes calldata proof) external view returns (bool)
function isIdentityVerified(address user, uint256 eventId) external view returns (bool)
```

---

### 5. BoundTicketNFT.sol

**Purpose**: ERC-721 tickets with transfer restrictions

**Transfer Modes**:

1. **Soulbound**: No transfers (except burn)
   - Strictest anti-scalping
   - No secondary market

2. **IdentityBound** (Default):
   - Transfers only to verified identities
   - Recipient must prove identity for same event
   - Enables curated resale

3. **Unrestricted** (Testing):
   - Normal ERC-721 transfers
   - For development only

**Key Functions**:
```solidity
function mintTicket(
    address winner,
    uint256 eventId,
    PoolClass poolClass,
    string calldata encryptedMetadataURI
) external returns (uint256 tokenId)

function redeemTicket(uint256 tokenId) external
function lockTicket(uint256 tokenId) external  // For auctions
function unlockTicket(uint256 tokenId) external
```

**Transfer Override**:
```solidity
function _update(address to, uint256 tokenId, address auth) internal override {
    if (transferMode == TransferMode.Soulbound && to != address(0)) {
        revert TransferNotAllowed();
    }
    if (transferMode == TransferMode.IdentityBound) {
        require(identityVerifier.isIdentityVerified(to, tickets[tokenId].eventId));
    }
    return super._update(to, tokenId, auth);
}
```

---

### 6. BlindAuction.sol

**Purpose**: Sealed-bid auctions for ticket resale

**Commit-Reveal Protocol**:

**Phase 1: Commit** (e.g., 1 hour)
```
1. Bidder creates commitment:
   commitment = H(bidAmount || salt)
   
2. Bidder deposits 10% of bid in ETH
   
3. Commitment stored on-chain
```

**Phase 2: Reveal** (e.g., 30 minutes)
```
1. Bidder reveals: (bidAmount, salt)
   
2. Contract verifies:
   H(bidAmount || salt) == stored commitment
   
3. Highest valid bid wins
```

**Phase 3: Settlement**
```
1. Winner transfers full bid in PYUSD
2. Seller receives (bid - platform fee)
3. Ticket NFT transferred to winner
4. Non-winners get deposit refunds
```

**Key Functions**:
```solidity
function createAuction(
    uint256 tokenId,
    uint256 minBid,
    uint256 reservePrice,
    uint64 commitDuration,
    uint64 revealDuration
) external returns (uint256 auctionId)

function commitBid(uint256 auctionId, bytes32 commitment) external payable
function revealBid(uint256 auctionId, uint256 bidAmount, bytes32 salt) external
function endAuction(uint256 auctionId) external
```

**Why Blind Auction?**
- Prevents sniping (last-second bids)
- Reduces bid manipulation
- Encourages true valuation bidding
- Fair for all participants

---

## User Flows

### Flow 1: Event Creation (Organizer)

```
1. Organizer calls EventManager.createEvent()
   ↓
2. Organizer calls EventManager.configurePool() for each pool (A/B/C)
   ↓
3. Wait until registrationStart timestamp
   ↓
4. Organizer calls EventManager.openRegistration()
   ↓
5. Users can now enter pools
```

### Flow 2: Lottery Participation (User)

```
1. User approves PYUSD to StakingPool
   ↓
2. User calls StakingPool.enterPool(eventId, poolClass, proof)
   → Identity verified
   → PYUSD transferred
   → Stake recorded
   ↓
3. Wait until registrationEnd
   ↓
4. Organizer closes registration
   ↓
5. Lottery draw happens (VRF)
   ↓
6a. If WINNER:
    → Claim ticket NFT
    → Attend event
    
6b. If LOSER:
    → Claim refund + rebate
    → Try next event
```

### Flow 3: Lottery Draw (System)

```
1. Registration window closes
   ↓
2. EventManager.closeRegistration() → state = Drawing
   ↓
3. For each pool:
   a. LotteryEngine.requestDraw() → Pyth Entropy request
   b. Wait for VRF fulfillment
   c. LotteryEngine.revealAndSelectWinners()
      → Fisher-Yates shuffle
      → Pick N winners
      → Notify StakingPool
   ↓
4. LotteryEngine.completeEventDraw()
   → Mark event as Allocated
   → Fund rebate pools
   ↓
5. Winners can claim tickets
   Losers can claim refunds
```

### Flow 4: Ticket Resale (Secondary Market)

```
1. Ticket holder creates auction:
   BlindAuction.createAuction(tokenId, minBid, reservePrice, ...)
   → Ticket locked in contract
   ↓
2. COMMIT PHASE (e.g., 1 hour):
   Bidders submit sealed bids:
   - Generate: commitment = H(bidAmount || salt)
   - Call: commitBid(auctionId, commitment) + deposit
   ↓
3. REVEAL PHASE (e.g., 30 min):
   Bidders reveal bids:
   - Call: revealBid(auctionId, bidAmount, salt)
   - Contract verifies commitment
   ↓
4. SETTLEMENT:
   - endAuction() called
   - Highest bidder wins
   - PYUSD transferred
   - Ticket NFT transferred
   - Deposits refunded to losers
```

---

## Integration Guides

### Integrating Pyth Entropy VRF

**Step 1: Deploy/Get Entropy Contract**
```javascript
const entropyAddress = "0x..."; // Pyth Entropy on Sepolia
const provider = yourWallet.address; // Your entropy provider
```

**Step 2: Request Randomness**
```javascript
const fee = await entropy.getFee(provider);
const userCommitment = ethers.keccak256(ethers.randomBytes(32));

const tx = await lotteryEngine.requestDraw(
    eventId,
    poolClass,
    { value: fee }
);
```

**Step 3: Reveal & Use**
```javascript
await lotteryEngine.revealAndSelectWinners(eventId, poolClass);
// Winners are now selected!
```

### Integrating PYUSD

**Contract Setup**:
```solidity
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

IERC20 public immutable PYUSD;

constructor(address _pyusd) {
    PYUSD = IERC20(_pyusd);
}
```

**Transfers**:
```solidity
// Receive
PYUSD.safeTransferFrom(user, address(this), amount);

// Send
PYUSD.safeTransfer(recipient, amount);
```

**Frontend (ethers.js)**:
```javascript
const pyusd = new ethers.Contract(pyusdAddress, ERC20_ABI, signer);

// Approve
await pyusd.approve(stakingPoolAddress, stakeAmount);

// Check balance
const balance = await pyusd.balanceOf(userAddress);
```

### Integrating World ID (Production)

**Step 1: Get World ID Proof (Frontend)**
```typescript
import { IDKitWidget } from '@worldcoin/idkit';


    {({ open }) => Verify with World ID}

```

**Step 2: Submit Proof (Contract)**
```solidity
function registerIdentity(
    address user,
    uint256 eventId,
    bytes32 commitment,
    bytes calldata proof  // World ID proof
) external {
    // Decode proof
    (uint256 root, uint256 nullifierHash, uint256[8] memory proof_) = 
        abi.decode(proof, (uint256, uint256, uint256[8]));
    
    // Verify with World ID
    IWorldID(worldIdRouter).verifyProof(
        root,
        groupId,
        abi.encodePacked(user).hashToField(),
        nullifierHash,
        abi.encodePacked(eventId).hashToField(),
        proof_
    );
    
    // Store identity
    identities[user][eventId] = Identity(...);
}
```

---

## Security Model

### Access Control

**Role-Based Permissions**:

| Role | Can Do |
|------|--------|
| Owner | Deploy, configure contracts, pause |
| Organizer | Create events, configure pools, manage lifecycle |
| User | Enter pools, claim tickets/refunds |
| LotteryEngine | Set winners, mark allocated |
| AuctionContract | Lock/unlock tickets |

### Attack Vectors & Mitigations

**1. Sybil Attack** (Multiple identities)
- ✅ **Mitigation**: World ID integration
- ✅ **Backup**: Nullifier tracking prevents reuse

**2. Front-Running** (MEV bots)
- ✅ **Mitigation**: Commit-reveal for auctions
- ✅ **Mitigation**: VRF for lottery (no manipulation)

**3. Reentrancy**
- ✅ **Mitigation**: ReentrancyGuard on all external calls
- ✅ **Mitigation**: Checks-Effects-Interactions pattern

**4. Randomness Manipulation**
- ✅ **Mitigation**: Pyth Entropy (cryptographically secure VRF)
- ✅ **Mitigation**: User + provider randomness combined

**5. Scalping / Bot Resale**
- ✅ **Mitigation**: Identity-bound NFTs
- ✅ **Mitigation**: On-platform auction only

**6. Denial of Service**
- ✅ **Mitigation**: Gas limits, batch operations
- ✅ **Mitigation**: Pausable contracts

**7. Oracle Failure**
- ✅ **Mitigation**: Pyth has redundancy
- ⚠️ **Risk**: If Pyth fails, lottery cannot proceed (acceptable tradeoff)

### Emergency Procedures

**Pause System**:
```solidity
function pause() external onlyOwner {
    _pause();
}

function unpause() external onlyOwner {
    _unpause();
}
```

**Cancel Event** (before draw):
```solidity
function cancelEvent(uint256 eventId) external onlyOrganizer {
    // Refund all stakes
    // Mark event as cancelled
}
```

---

## Gas Optimization

### Current Optimizations

1. **Packing Storage**:
   ```solidity
   struct Ticket {
       uint256 tokenId;
       uint256 eventId;
       uint8 poolClass;      // Packed
       uint64 mintedAt;      // Packed
       bool redeemed;        // Packed
       bool locked;          // Packed
   }
   ```

2. **Batch Operations**:
   ```solidity
   function batchMintTickets(address[] calldata winners, ...) external
   ```

3. **Immutable Variables**:
   ```solidity
   IERC20 public immutable PYUSD;
   IEntropy public immutable entropy;
   ```

### Future Optimizations (L2 Deployment)

- Deploy on Arbitrum/Optimism for 10-100x cheaper gas
- Use calldata instead of memory where possible
- Implement EIP-2930 access lists
- Optimize loops with unchecked arithmetic

---

## Testing Strategy

### Unit Tests
- ✅ Each contract function tested in isolation
- ✅ Edge cases (zero values, overflows, reverts)
- ✅ Access control enforcement

### Integration Tests
- ✅ Full flow: create event → stake → draw → claim
- ✅ Multi-pool scenarios
- ✅ Contract interactions

### Scenario Tests
- ✅ High demand (100+ users, 10 tickets)
- ✅ Low demand (2 users, 10 tickets)
- ✅ Cancellation and refunds
- ✅ Auction with multiple bidders

### Security Tests
- ✅ Reentrancy attempts
- ✅ Double-registration attempts
- ✅ Unauthorized access
- ✅ Invalid VRF responses

---

## Deployment Checklist

### Pre-Deployment

- [ ] Set environment variables (.env)
- [ ] Get Sepolia ETH for gas
- [ ] Get testnet PYUSD (or deploy mock)
- [ ] Verify Pyth Entropy address
- [ ] Set treasury address

### Deployment Steps

```bash
# 1. Compile
npx hardhat compile

# 2. Run tests
npx hardhat test

# 3. Deploy to localhost (test)
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# 4. Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# 5. Verify contracts
npx hardhat verify --network sepolia  
```


