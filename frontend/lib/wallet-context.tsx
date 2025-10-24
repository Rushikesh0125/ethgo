"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";
import { NETWORK_CONFIG } from "./contracts/addresses";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  balance: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize provider
  const initializeProvider = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return null;

    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      setProvider(browserProvider);
      return browserProvider;
    } catch (err) {
      console.error("Failed to initialize provider:", err);
      return null;
    }
  }, []);

  // Get balance
  const getBalance = useCallback(async (addr: string, prov: BrowserProvider) => {
    try {
      const balanceWei = await prov.getBalance(addr);
      const balanceEth = ethers.formatEther(balanceWei);
      setBalance(balanceEth);
    } catch (err) {
      console.error("Failed to get balance:", err);
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed. Please install MetaMask to continue.");
      }

      // Initialize provider
      const browserProvider = await initializeProvider();
      if (!browserProvider) {
        throw new Error("Failed to initialize Web3 provider");
      }

      // Request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const userAddress = accounts[0];
      setAddress(userAddress);

      // Get signer
      const userSigner = await browserProvider.getSigner();
      setSigner(userSigner);

      // Get chain ID
      const network = await browserProvider.getNetwork();
      setChainId(Number(network.chainId));

      // Get balance
      await getBalance(userAddress, browserProvider);

      // Store in localStorage
      localStorage.setItem("walletAddress", userAddress);

      console.log("✅ Wallet connected:", userAddress);
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setError(err.message || "Failed to connect wallet");
      setAddress(null);
      setSigner(null);
    } finally {
      setIsConnecting(false);
    }
  }, [initializeProvider, getBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setBalance(null);
    setChainId(null);
    setError(null);
    localStorage.removeItem("walletAddress");
    console.log("🔌 Wallet disconnected");
  }, []);

  // Switch network
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not installed");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
      });
    } catch (err: any) {
      // If chain doesn't exist, add it
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
                chainName: NETWORK_CONFIG.chainName,
                nativeCurrency: NETWORK_CONFIG.nativeCurrency,
                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                blockExplorerUrls: [NETWORK_CONFIG.blockExplorerUrl],
              },
            ],
          });
        } catch (addErr: any) {
          console.error("Failed to add network:", addErr);
          setError(addErr.message || "Failed to add network");
        }
      } else {
        console.error("Failed to switch network:", err);
        setError(err.message || "Failed to switch network");
      }
    }
  }, []);

  // Auto-connect on mount if previously connected
  useEffect(() => {
    const storedAddress = localStorage.getItem("walletAddress");
    if (storedAddress) {
      connectWallet();
    } else {
      initializeProvider();
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== address) {
        setAddress(accounts[0]);
        localStorage.setItem("walletAddress", accounts[0]);
        if (provider) {
          getBalance(accounts[0], provider);
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      // Reload to avoid state issues
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [address, provider, disconnectWallet, getBalance]);

  const value: WalletContextType = {
    address,
    isConnected: !!address,
    isConnecting,
    chainId,
    balance,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    error,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}