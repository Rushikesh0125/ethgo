"use client";

import { useState, useCallback, useEffect } from "react";
import { useEventContract } from "./use-contracts";

export interface EventData {
  name: string;
  saleStartTime: bigint;
  saleEndTime: bigint;
  revealTime: bigint;
}

export interface TierData {
  genPrice: bigint;
  premiumPrice: bigint;
  maxSupply: bigint;
  premiumMaxSupply: bigint;
  genSeed: bigint;
  premiumSeed: bigint;
}

/**
 * Hook to read event data from Event contract
 */
export function useEventData(eventAddress: string) {
  const eventContract = useEventContract(eventAddress);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch event metadata
   */
  const fetchEventData = useCallback(async () => {
    if (!eventContract) return;

    setIsLoading(true);
    try {
      const data = await eventContract.eventData();
      setEventData({
        name: data.name,
        saleStartTime: data.saleStartTime,
        saleEndTime: data.saleEndTime,
        revealTime: data.revealTime,
      });
    } catch (error) {
      console.error("Fetch event data error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [eventContract]);

  /**
   * Get tier data
   */
  const getTierData = useCallback(
    async (tierId: number): Promise<TierData | null> => {
      if (!eventContract) return null;

      try {
        const data = await eventContract.tiers(tierId);
        return {
          genPrice: data.genPrice,
          premiumPrice: data.premiumPrice,
          maxSupply: data.maxSupply,
          premiumMaxSupply: data.premiumMaxSupply,
          genSeed: data.genSeed,
          premiumSeed: data.premiumSeed,
        };
      } catch (error) {
        console.error("Get tier data error:", error);
        return null;
      }
    },
    [eventContract]
  );

  /**
   * Check if user is allotted (won) a ticket
   */
  const isAllotted = useCallback(
    async (tierId: number, slotId: number, userAddress: string): Promise<boolean> => {
      if (!eventContract) return false;

      try {
        const allotted = await eventContract.isAlloted(tierId, slotId, userAddress);
        return allotted;
      } catch (error) {
        console.error("Check allotment error:", error);
        return false;
      }
    },
    [eventContract]
  );

  /**
   * Get booking count for a tier/slot
   */
  const getBookingCount = useCallback(
    async (tierId: number, slotId: number): Promise<number> => {
      if (!eventContract) return 0;

      try {
        const count = await eventContract.getBookingCount(tierId, slotId);
        return Number(count);
      } catch (error) {
        console.error("Get booking count error:", error);
        return 0;
      }
    },
    [eventContract]
  );

  /**
   * Check if user has registered for a tier/slot
   */
  const hasUserRegistered = useCallback(
    async (tierId: number, slotId: number, userAddress: string): Promise<boolean> => {
      if (!eventContract) return false;

      try {
        const registered = await eventContract.hasRegistered(tierId, slotId, userAddress);
        return registered;
      } catch (error) {
        console.error("Check registration error:", error);
        return false;
      }
    },
    [eventContract]
  );

  // Auto-fetch event data on mount
  useEffect(() => {
    if (eventContract) {
      fetchEventData();
    }
  }, [eventContract, fetchEventData]);

  return {
    eventData,
    isLoading,
    fetchEventData,
    getTierData,
    isAllotted,
    getBookingCount,
    hasUserRegistered,
  };
}