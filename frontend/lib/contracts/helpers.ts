/**
 * Contract Helper Utilities
 */

import { formatUnits, parseUnits } from "ethers";

/**
 * Format PYUSD amount (6 decimals)
 */
export function formatPYUSD(amount: bigint): string {
  return formatUnits(amount, 6);
}

/**
 * Parse PYUSD amount (6 decimals)
 */
export function parsePYUSD(amount: string): bigint {
  return parseUnits(amount, 6);
}

/**
 * Format ETH amount (18 decimals)
 */
export function formatETH(amount: bigint): string {
  return formatUnits(amount, 18);
}

/**
 * Parse ETH amount (18 decimals)
 */
export function parseETH(amount: string): bigint {
  return parseUnits(amount, 18);
}

/**
 * Truncate Ethereum address
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Get block explorer URL for address
 */
export function getExplorerAddressURL(address: string, explorerUrl: string): string {
  return `${explorerUrl}/address/${address}`;
}

/**
 * Get block explorer URL for transaction
 */
export function getExplorerTxURL(txHash: string, explorerUrl: string): string {
  return `${explorerUrl}/tx/${txHash}`;
}

/**
 * Check if sale is active
 */
export function isSaleActive(saleStartTime: bigint, saleEndTime: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now >= saleStartTime && now < saleEndTime;
}

/**
 * Check if reveal time has passed
 */
export function isRevealTime(revealTime: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now >= revealTime;
}

/**
 * Get time remaining until timestamp
 */
export function getTimeRemaining(timestamp: bigint): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(timestamp) - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return { days, hours, minutes, seconds };
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

/**
 * Calculate odds of winning
 */
export function calculateOdds(maxSupply: number, bookingCount: number): number {
  if (bookingCount === 0) return 100;
  if (maxSupply === 0) return 0;
  return Math.min(100, (maxSupply / bookingCount) * 100);
}

/**
 * Slot ID to name
 */
export function getSlotName(slotId: number): string {
  return slotId === 0 ? "Premium" : "General";
}

/**
 * Parse contract error message
 */
export function parseContractError(error: any): string {
  if (error.reason) return error.reason;
  if (error.message) {
    // Extract revert reason from error message
    const match = error.message.match(/reverted with reason string '(.+)'/);
    if (match) return match[1];

    // Extract custom error
    const customMatch = error.message.match(/reverted with custom error '(.+)'/);
    if (customMatch) return customMatch[1];

    return error.message;
  }
  return "Transaction failed";
}

/**
 * Wait for transaction with user-friendly updates
 */
export async function waitForTransaction(
  tx: any,
  onPending?: () => void,
  onSuccess?: (receipt: any) => void,
  onError?: (error: any) => void
): Promise<any> {
  try {
    if (onPending) onPending();
    const receipt = await tx.wait();
    if (onSuccess) onSuccess(receipt);
    return receipt;
  } catch (error) {
    if (onError) onError(error);
    throw error;
  }
}
