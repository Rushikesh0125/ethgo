# FairStake Tickets - Smart Contract Deployment Guide

## Prerequisites

### 1. Node.js Version
**IMPORTANT**: You must use Node.js 22.x LTS (not 23.x)

```bash
# Check your Node version
node --version

# If you're using nvm, switch to Node 22
nvm install 22
nvm use 22
nvm alias default 22
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

## Smart Contract Architecture

### Core Contracts (6)
1. **EventManager** - Manages events, pools, and lifecycle
2. **StakingPool** - Handles PYUSD stakes and rebates
3. **LotteryEngine** - VRF-based lottery draws (Pyth Entropy)
4. **IdentityVerifier** - World ID integration
5. **BoundTicketNFT** - Soulbound/identity-bound tickets
6. **BlindAuction** - Commit-reveal sealed-bid auctions

### Mock Contracts (for Testnet)
1. **MockPYUSD** - ERC-20 stablecoin (6 decimals)
2. **MockEntropy** - Pyth Entropy VRF simulator

## Compilation

```bash
# Compile all contracts
npx hardhat compile

# Clean and recompile
npx hardhat clean && npx hardhat compile
```

## Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/FairStakeTickets.test.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Coverage
- ✅ Event Creation & Pool Configuration
- ✅ Registration & Staking with PYUSD
- ✅ Lottery Draw with VRF
- ✅ Ticket Minting & Claiming
- ✅ Rebate Distribution for Losers

## Deployment

### Local Deployment (Hardhat Network)
```bash
# Start local node
npx hardhat node

# In another terminal, deploy
npx hardhat run scripts/deploy.ts --network localhost
```

### Testnet Deployment (Sepolia)
```bash
# Make sure .env is configured with:
# - SEPOLIA_RPC_URL
# - SEPOLIA_PRIVATE_KEY
# - ETHERSCAN_API_KEY

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

### Post-Deployment
After deployment, the script will:
- ✅ Deploy all 8 contracts
- ✅ Wire up contract dependencies
- ✅ Add deployer to identity whitelist
- ✅ Mint 100k PYUSD for testing
- ✅ Save addresses to `deployment-addresses.json`

## Contract Verification

After deployment, verify contracts on Etherscan:

```bash
# Example: Verify EventManager
npx hardhat verify --network sepolia <EVENT_MANAGER_ADDRESS>

# Example: Verify StakingPool (with constructor args)
npx hardhat verify --network sepolia <STAKING_POOL_ADDRESS> \
  <PYUSD_ADDRESS> \
  <TREASURY_ADDRESS>
```

## Interaction Scripts

### Creating an Event
```typescript
import hre from "hardhat";

const eventManager = await hre.ethers.getContractAt(
  "EventManager",
  "0x..."  // from deployment-addresses.json
);

const tx = await eventManager.createEvent(
  "Concert 2025",
  "ipfs://metadata",
  Math.floor(Date.now() / 1000) + 3600,  // starts in 1 hour
  Math.floor(Date.now() / 1000) + 7200,  // ends in 2 hours
  Math.floor(Date.now() / 1000) + 14400, // claim deadline
  250,   // 2.5% platform fee
  3000   // 30% rebate alpha
);
```

### Configuring Pools
```typescript
// Pool A: 500 PYUSD, 10 tickets
await eventManager.configurePool(
  0,  // eventId
  0,  // PoolClass.A
  hre.ethers.parseUnits("500", 6),
  10
);
```

### Staking & Entering Pool
```typescript
const stakingPool = await hre.ethers.getContractAt("StakingPool", "0x...");
const pyusd = await hre.ethers.getContractAt("MockPYUSD", "0x...");

// Approve PYUSD
const stakeAmount = hre.ethers.parseUnits("512.5", 6); // 500 + 2.5% fee
await pyusd.approve(stakingPool.address, stakeAmount);

// Enter pool
await stakingPool.enterPool(
  0,  // eventId
  0,  // PoolClass.A
  "0x"  // identityProof (empty for testnet)
);
```

## Gas Optimization

The contracts use:
- ✅ Solidity 0.8.28 with optimizer enabled
- ✅ `viaIR: true` for better code generation
- ✅ 200 optimization runs (balanced for deployment + runtime)

## Security Features

### Implemented
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Access Control (Ownable, custom modifiers)
- ✅ Pausable pattern for emergency stops
- ✅ Input validation on all public functions
- ✅ SafeERC20 for token transfers
- ✅ Identity binding to prevent scalping

### Recommended (Before Mainnet)
- 🔒 Professional security audit
- 🔒 Multi-sig treasury (Gnosis Safe)
- 🔒 Timelock for admin functions
- 🔒 Bug bounty program
- 🔒 Emergency withdrawal mechanism

## Troubleshooting

### Issue: "Node.js 23.x not supported"
**Solution**: Downgrade to Node.js 22.x LTS
```bash
nvm install 22 && nvm use 22
```

### Issue: "Stack too deep" compilation error
**Solution**: Already fixed with `viaIR: true` in hardhat.config.ts

### Issue: Tests failing with "ethers undefined"
**Solution**: Tests use `hre.ethers` - requires Node.js 22.x

### Issue: "Insufficient funds" during deployment
**Solution**: Fund your deployer wallet with Sepolia ETH
- Get testnet ETH from: https://sepoliafaucet.com/

## Network Configuration

### Supported Networks
- `hardhatMainnet` - Local Hardhat network (L1 simulation)
- `hardhatOp` - Local Hardhat network (OP Stack simulation)
- `sepolia` - Sepolia testnet

### Adding New Networks
Edit `hardhat.config.ts`:
```typescript
networks: {
  // ... existing networks
  yourNetwork: {
    type: "http",
    chainType: "l1",
    url: configVariable("YOUR_RPC_URL"),
    accounts: [configVariable("YOUR_PRIVATE_KEY")],
  },
}
```

## Useful Commands

```bash
# List all Hardhat tasks
npx hardhat help

# Get account balance
npx hardhat run scripts/check-balance.ts --network sepolia

# Clean artifacts
npx hardhat clean

# Compile with detailed output
npx hardhat compile --show-stack-traces

# Run tests with detailed gas reporting
REPORT_GAS=true npx hardhat test --verbose
```

## Contract Addresses (After Deployment)

After running deployment, check `deployment-addresses.json`:
```json
{
  "network": "sepolia",
  "timestamp": "2025-10-15T...",
  "deployer": "0x...",
  "contracts": {
    "MockPYUSD": "0x...",
    "MockEntropy": "0x...",
    "EventManager": "0x...",
    "StakingPool": "0x...",
    "LotteryEngine": "0x...",
    "IdentityVerifier": "0x...",
    "BoundTicketNFT": "0x...",
    "BlindAuction": "0x..."
  }
}
```


