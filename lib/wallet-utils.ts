export const FLOW_TESTNET_CONFIG = {
  chainId: 545,
  chainName: "Flow EVM Testnet",
  rpcUrl: "https://testnet.evm.nodes.onflow.org",
  blockExplorerUrl: "https://evm-testnet.flowscan.io",
}

export const getStoredWallet = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("userWallet")
}

export const storeWallet = (address: string) => {
  localStorage.setItem("userWallet", address)
}

export const disconnectWallet = () => {
  localStorage.removeItem("userWallet")
  localStorage.removeItem("userEntries")
}

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
