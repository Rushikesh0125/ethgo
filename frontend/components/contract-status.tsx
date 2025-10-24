"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useContracts } from "@/hooks/use-contracts";
import { CONTRACT_ADDRESSES, NETWORK_CONFIG, validateAddresses } from "@/lib/contracts/addresses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

/**
 * Component to verify contract integration status
 * Use this to test if everything is configured correctly
 */
export function ContractStatus() {
  const { address, isConnected, connectWallet, chainId } = useWallet();
  const contracts = useContracts();
  const [routerCode, setRouterCode] = useState<string | null>(null);
  const [factoryCode, setFactoryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkContracts = async () => {
      if (!contracts) return;

      setLoading(true);
      try {
        // Check if contracts have code deployed
        const routerCodeData = await contracts.eventRouter.runner?.provider?.getCode(
          CONTRACT_ADDRESSES.EventRouter
        );
        const factoryCodeData = await contracts.eventFactory.runner?.provider?.getCode(
          CONTRACT_ADDRESSES.EventFactory
        );

        setRouterCode(routerCodeData || null);
        setFactoryCode(factoryCodeData || null);
      } catch (error) {
        console.error("Error checking contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    if (contracts) {
      checkContracts();
    }
  }, [contracts]);

  const isRouterDeployed = routerCode && routerCode !== "0x";
  const isFactoryDeployed = factoryCode && factoryCode !== "0x";
  const isCorrectNetwork = chainId === NETWORK_CONFIG.chainId;
  const addressesConfigured = validateAddresses();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Integration Status</CardTitle>
        <CardDescription>Verify that your smart contracts are configured correctly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Wallet Connection</h3>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm">Not connected</span>
                <Button onClick={connectWallet} size="sm" className="ml-auto">
                  Connect Wallet
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Network Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Network</h3>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                {isCorrectNetwork ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm">
                      {NETWORK_CONFIG.chainName} (Chain ID: {chainId})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm">
                      Wrong network! Connected to {chainId}, need {NETWORK_CONFIG.chainId}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Connect wallet to check</span>
            )}
          </div>
        </div>

        {/* Contract Addresses */}
        <div className="space-y-2">
          <h3 className="font-semibold">Contract Addresses</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              {isRouterDeployed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium">EventRouter</div>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {CONTRACT_ADDRESSES.EventRouter}
                </code>
                {loading && <Badge variant="outline" className="ml-2">Checking...</Badge>}
                {!loading && isRouterDeployed && (
                  <Badge variant="default" className="ml-2">Deployed ✓</Badge>
                )}
                {!loading && !isRouterDeployed && routerCode !== null && (
                  <Badge variant="destructive" className="ml-2">Not found</Badge>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              {isFactoryDeployed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium">EventFactory</div>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {CONTRACT_ADDRESSES.EventFactory}
                </code>
                {loading && <Badge variant="outline" className="ml-2">Checking...</Badge>}
                {!loading && isFactoryDeployed && (
                  <Badge variant="default" className="ml-2">Deployed ✓</Badge>
                )}
                {!loading && !isFactoryDeployed && factoryCode !== null && (
                  <Badge variant="destructive" className="ml-2">Not found</Badge>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              {CONTRACT_ADDRESSES.PYUSD === "0x0000000000000000000000000000000000000000" ? (
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium">PYUSD Token</div>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {CONTRACT_ADDRESSES.PYUSD}
                </code>
                {CONTRACT_ADDRESSES.PYUSD === "0x0000000000000000000000000000000000000000" && (
                  <Badge variant="outline" className="ml-2">Not configured</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2">
            {isConnected && isCorrectNetwork && isRouterDeployed && isFactoryDeployed ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-semibold text-green-600">Ready to use!</div>
                  <div className="text-xs text-muted-foreground">
                    All main contracts are deployed and accessible
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-yellow-600" />
                <div>
                  <div className="font-semibold">Setup needed</div>
                  <div className="text-xs text-muted-foreground">
                    {!isConnected && "Connect your wallet. "}
                    {isConnected && !isCorrectNetwork && "Switch to the correct network. "}
                    {!isRouterDeployed && "EventRouter not found. "}
                    {!isFactoryDeployed && "EventFactory not found. "}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="pt-2 text-xs text-muted-foreground space-y-1">
          <div>
            <strong>Block Explorer:</strong>{" "}
            <a
              href={`${NETWORK_CONFIG.blockExplorerUrl}/address/${CONTRACT_ADDRESSES.EventRouter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View EventRouter
            </a>
          </div>
          <div>
            <strong>RPC URL:</strong> {NETWORK_CONFIG.rpcUrl}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
