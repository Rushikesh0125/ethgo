"use client";

import { useMemo } from "react";
import { Contract } from "ethers";
import { useWallet } from "@/lib/wallet-context";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Import ABIs
import EventRouterABI from "@/lib/contracts/abis/EventRouter.json";
import EventFactoryABI from "@/lib/contracts/abis/EventFactory.json";
import EventABI from "@/lib/contracts/abis/Event.json";
import TicketNFTABI from "@/lib/contracts/abis/TicketNFT.json";
import ERC20ABI from "@/lib/contracts/abis/ERC20.json";

/**
 * Hook to get contract instances with signer (for write operations)
 */
export function useContracts() {
  const { signer, provider } = useWallet();

  const contracts = useMemo(() => {
    if (!signer && !provider) return null;

    const signerOrProvider = signer || provider;

    return {
      // Main contracts
      eventRouter: new Contract(
        CONTRACT_ADDRESSES.EventRouter,
        EventRouterABI.abi,
        signerOrProvider
      ),
      eventFactory: new Contract(
        CONTRACT_ADDRESSES.EventFactory,
        EventFactoryABI.abi,
        signerOrProvider
      ),
      // Payment token
      pyusd: new Contract(
        CONTRACT_ADDRESSES.PYUSD,
        ERC20ABI.abi,
        signerOrProvider
      ),
    };
  }, [signer, provider]);

  return contracts;
}

/**
 * Hook to get a specific Event contract instance
 */
export function useEventContract(eventAddress: string) {
  const { signer, provider } = useWallet();

  return useMemo(() => {
    if (!signer && !provider) return null;
    if (!eventAddress || eventAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    const signerOrProvider = signer || provider;
    return new Contract(eventAddress, EventABI.abi, signerOrProvider);
  }, [eventAddress, signer, provider]);
}

/**
 * Hook to get a specific TicketNFT contract instance
 */
export function useTicketNFTContract(nftAddress: string) {
  const { signer, provider } = useWallet();

  return useMemo(() => {
    if (!signer && !provider) return null;
    if (!nftAddress || nftAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    const signerOrProvider = signer || provider;
    return new Contract(nftAddress, TicketNFTABI.abi, signerOrProvider);
  }, [nftAddress, signer, provider]);
}