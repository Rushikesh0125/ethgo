"use client";

import { useState, useCallback } from "react";
import { useContracts } from "./use-contracts";
import { useWallet } from "@/lib/wallet-context";
import { toast } from "sonner";

/**
 * Hook for interacting with EventRouter contract
 */
export function useEventRouter() {
  const contracts = useContracts();
  const { address, signer } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Register booking for an event tier
   */
  const registerBooking = useCallback(
    async (eventId: number, tierId: number, slotId: number) => {
      if (!contracts || !address || !signer) {
        toast.error("Please connect your wallet first");
        return { success: false, error: "Wallet not connected" };
      }

      setIsLoading(true);
      try {
        // Call registerBooking on EventRouter
        const tx = await contracts.eventRouter.registerBooking(eventId, tierId, slotId);

        toast.loading("Registering booking...", { id: "register-tx" });
        const receipt = await tx.wait();

        toast.success("Booking registered successfully!", { id: "register-tx" });

        return { success: true, receipt };
      } catch (error: any) {
        console.error("Register booking error:", error);
        const errorMessage = error.reason || error.message || "Failed to register booking";
        toast.error(errorMessage, { id: "register-tx" });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [contracts, address, signer]
  );

  /**
   * Unregister booking (cancel and get refund)
   */
  const unregisterBooking = useCallback(
    async (eventId: number, tierId: number, slotId: number) => {
      if (!contracts || !address || !signer) {
        toast.error("Please connect your wallet first");
        return { success: false, error: "Wallet not connected" };
      }

      setIsLoading(true);
      try {
        const tx = await contracts.eventRouter.unregisterBooking(eventId, tierId, slotId);

        toast.loading("Cancelling booking...", { id: "unregister-tx" });
        const receipt = await tx.wait();

        toast.success("Booking cancelled, refund processed!", { id: "unregister-tx" });

        return { success: true, receipt };
      } catch (error: any) {
        console.error("Unregister booking error:", error);
        const errorMessage = error.reason || error.message || "Failed to cancel booking";
        toast.error(errorMessage, { id: "unregister-tx" });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [contracts, address, signer]
  );

  /**
   * Claim ticket after winning allocation
   */
  const claimTicket = useCallback(
    async (eventId: number, tierId: number, slotId: number) => {
      if (!contracts || !address || !signer) {
        toast.error("Please connect your wallet first");
        return { success: false, error: "Wallet not connected" };
      }

      setIsLoading(true);
      try {
        const tx = await contracts.eventRouter.claimTicket(eventId, tierId, slotId);

        toast.loading("Claiming ticket NFT...", { id: "claim-tx" });
        const receipt = await tx.wait();

        toast.success("Ticket NFT claimed successfully!", { id: "claim-tx" });

        return { success: true, receipt };
      } catch (error: any) {
        console.error("Claim ticket error:", error);
        const errorMessage = error.reason || error.message || "Failed to claim ticket";
        toast.error(errorMessage, { id: "claim-tx" });
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [contracts, address, signer]
  );

  /**
   * Get event address from router
   */
  const getEventAddress = useCallback(
    async (eventId: number): Promise<string | null> => {
      if (!contracts) return null;

      try {
        const eventAddress = await contracts.eventRouter.eventAddresses(eventId);
        return eventAddress;
      } catch (error) {
        console.error("Get event address error:", error);
        return null;
      }
    },
    [contracts]
  );

  /**
   * Get ticket NFT address for an event
   */
  const getTicketNFTAddress = useCallback(
    async (eventId: number): Promise<string | null> => {
      if (!contracts) return null;

      try {
        const nftAddress = await contracts.eventRouter.ticketNFTAddresses(eventId);
        return nftAddress;
      } catch (error) {
        console.error("Get NFT address error:", error);
        return null;
      }
    },
    [contracts]
  );

  /**
   * Check if user already claimed ticket
   */
  const hasClaimedTicket = useCallback(
    async (eventId: number, tierId: number, slotId: number, userAddress?: string): Promise<boolean> => {
      if (!contracts) return false;

      try {
        const addr = userAddress || address;
        if (!addr) return false;

        const claimed = await contracts.eventRouter.claimed(eventId, tierId, slotId, addr);
        return claimed;
      } catch (error) {
        console.error("Check claimed error:", error);
        return false;
      }
    },
    [contracts, address]
  );

  return {
    registerBooking,
    unregisterBooking,
    claimTicket,
    getEventAddress,
    getTicketNFTAddress,
    hasClaimedTicket,
    isLoading,
  };
}