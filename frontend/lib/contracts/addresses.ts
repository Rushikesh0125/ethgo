/**
 * Contract Addresses Configuration
 *
 * UPDATE THESE ADDRESSES AFTER DEPLOYMENT!
 * Ask your friend to provide the deployed contract addresses.
 */

export const CONTRACT_ADDRESSES = {
  // Main contracts - DEPLOYED ON SEPOLIA
  EventRouter: process.env.NEXT_PUBLIC_EVENT_ROUTER_ADDRESS || "0x07bc3643282fD005cd4B9B095209aD838B561B8a",
  EventFactory: process.env.NEXT_PUBLIC_EVENT_FACTORY_ADDRESS || "0xb19174e0Fcca8e34c271Fd9d570B30E6719BF289",

  // Payment token (PYUSD) - UPDATE WITH TESTNET ADDRESS
  PYUSD: process.env.NEXT_PUBLIC_PYUSD_ADDRESS || "0x0000000000000000000000000000000000000000",

  // Pyth Entropy (for VRF) - UPDATE WITH TESTNET ADDRESS
  PythEntropy: process.env.NEXT_PUBLIC_PYTH_ENTROPY_ADDRESS || "0x0000000000000000000000000000000000000000",
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "421614"), // Default: Arbitrum Sepolia
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || "Arbitrum Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
  blockExplorerUrl: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || "https://sepolia.arbiscan.io",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
} as const;

// Validation helper
export function validateAddresses() {
  const nullAddress = "0x0000000000000000000000000000000000000000";
  const issues: string[] = [];

  Object.entries(CONTRACT_ADDRESSES).forEach(([name, address]) => {
    if (address === nullAddress) {
      issues.push(`${name} address not configured`);
    }
  });

  if (issues.length > 0) {
    console.warn("⚠️ Contract address configuration issues:", issues);
    return false;
  }

  console.log("✅ All contract addresses configured");
  return true;
}