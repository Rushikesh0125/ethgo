"use client";

import { useState, useCallback } from "react";
import { parseUnits, MaxUint256 } from "ethers";
import { useContracts } from "./use-contracts";
import { useWallet } from "@/lib/wallet-context";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { toast } from "sonner";

/**
 * Hook for managing ERC20 token approvals (PYUSD)
 */
export function useTokenApproval() {
  const contracts = useContracts();
  const { address, signer } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Check current allowance
   */
  const checkAllowance = useCallback(
    async (spender: string = CONTRACT_ADDRESSES.EventRouter): Promise<bigint> => {
      if (!contracts || !address) return BigInt(0);

      try {
        const allowance = await contracts.pyusd.allowance(address, spender);
        return allowance;
      } catch (error) {
        console.error("Check allowance error:", error);
        return BigInt(0);
      }
    },
    [contracts, address]
  );

  /**
   * Approve PYUSD spending
   */
  const approvePYUSD = useCallback(
    async (amount: string, decimals: number = 6) => {
      if (!contracts || !address || !signer) {
        toast.error("Please connect your wallet first");
        return { success: false, error: "Wallet not connected" };
      }

      setIsLoading(true);
      try {
        const amountWei = parseUnits(amount, decimals);
        const tx = await contracts.pyusd.approve(CONTRACT_ADDRESSES.EventRouter, amountWei);

        toast.loading("Approving PYUSD...", { id: "approve-tx" });
        const receipt = await tx.wait();

        toast.success("PYUSD approved successfully!", { id: "approve-tx" });

        return { success: true, receipt };
      } catch (error: any) {
        console.error("Approve error:", error);
        const errorMessage = error.reason || error.message || "Failed to approve PYUSD";
        toast.error(errorMessage, { id: "approve-tx" });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [contracts, address, signer]
  );

  /**
   * Approve unlimited PYUSD (max uint256)
   */
  const approveUnlimited = useCallback(async () => {
    if (!contracts || !address || !signer) {
      toast.error("Please connect your wallet first");
      return { success: false, error: "Wallet not connected" };
    }

    setIsLoading(true);
    try {
      const tx = await contracts.pyusd.approve(CONTRACT_ADDRESSES.EventRouter, MaxUint256);

      toast.loading("Approving unlimited PYUSD...", { id: "approve-tx" });
      const receipt = await tx.wait();

      toast.success("Unlimited PYUSD approved!", { id: "approve-tx" });

      return { success: true, receipt };
    } catch (error: any) {
      console.error("Approve unlimited error:", error);
      const errorMessage = error.reason || error.message || "Failed to approve PYUSD";
      toast.error(errorMessage, { id: "approve-tx" });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [contracts, address, signer]);

  /**
   * Get PYUSD balance
   */
  const getPYUSDBalance = useCallback(async (): Promise<bigint> => {
    if (!contracts || !address) return BigInt(0);

    try {
      const balance = await contracts.pyusd.balanceOf(address);
      return balance;
    } catch (error) {
      console.error("Get balance error:", error);
      return BigInt(0);
    }
  }, [contracts, address]);

  /**
   * Check if approval is needed
   */
  const needsApproval = useCallback(
    async (requiredAmount: string, decimals: number = 6): Promise<boolean> => {
      const allowance = await checkAllowance();
      const required = parseUnits(requiredAmount, decimals);
      return allowance < required;
    },
    [checkAllowance]
  );

  return {
    checkAllowance,
    approvePYUSD,
    approveUnlimited,
    getPYUSDBalance,
    needsApproval,
    isLoading,
  };
}