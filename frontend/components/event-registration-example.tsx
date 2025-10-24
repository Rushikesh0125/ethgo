"use client";

import { useState, useEffect } from "react";
import { formatUnits } from "ethers";
import { useWallet } from "@/lib/wallet-context";
import { useEventRouter } from "@/hooks/use-event-router";
import { useEventData } from "@/hooks/use-event-data";
import { useTokenApproval } from "@/hooks/use-token-approval";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface EventRegistrationExampleProps {
  eventId: number;
  eventAddress: string;
  tierId: number;
  slotId: number;
}

/**
 * Example component demonstrating contract integration
 * Shows how to register for an event, approve tokens, and claim tickets
 */
export function EventRegistrationExample({
  eventId,
  eventAddress,
  tierId,
  slotId,
}: EventRegistrationExampleProps) {
  const { address, isConnected } = useWallet();
  const { registerBooking, unregisterBooking, claimTicket, hasClaimedTicket } = useEventRouter();
  const { eventData, getTierData, isAllotted, hasUserRegistered, getBookingCount } =
    useEventData(eventAddress);
  const { approvePYUSD, needsApproval, getPYUSDBalance } = useTokenApproval();

  const [tierData, setTierData] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [bookingCount, setBookingCount] = useState(0);
  const [pyusdBalance, setPyusdBalance] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);

  // Load tier data and user status
  useEffect(() => {
    if (!eventAddress || !address) return;

    const loadData = async () => {
      // Get tier data
      const tier = await getTierData(tierId);
      setTierData(tier);

      // Check if user registered
      const registered = await hasUserRegistered(tierId, slotId, address);
      setIsRegistered(registered);

      // Check if user is a winner
      const winner = await isAllotted(tierId, slotId, address);
      setIsWinner(winner);

      // Check if already claimed
      const claimed = await hasClaimedTicket(eventId, tierId, slotId);
      setHasClaimed(claimed);

      // Get booking count
      const count = await getBookingCount(tierId, slotId);
      setBookingCount(count);

      // Get PYUSD balance
      const balance = await getPYUSDBalance();
      setPyusdBalance(balance);
    };

    loadData();
  }, [
    eventAddress,
    address,
    tierId,
    slotId,
    eventId,
    getTierData,
    hasUserRegistered,
    isAllotted,
    hasClaimedTicket,
    getBookingCount,
    getPYUSDBalance,
  ]);

  // Handle registration
  const handleRegister = async () => {
    if (!tierData) return;

    setLoading(true);
    try {
      // Determine price based on slot (0 = premium, 1 = general)
      const price = slotId === 0 ? tierData.premiumPrice : tierData.genPrice;
      const priceFormatted = formatUnits(price, 6); // PYUSD has 6 decimals

      // Check if approval needed
      const needsApprove = await needsApproval(priceFormatted, 6);

      if (needsApprove) {
        toast.info("Please approve PYUSD first");
        const approveResult = await approvePYUSD(priceFormatted, 6);
        if (!approveResult.success) {
          setLoading(false);
          return;
        }
      }

      // Register booking
      const result = await registerBooking(eventId, tierId, slotId);
      if (result.success) {
        setIsRegistered(true);
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancellation
  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await unregisterBooking(eventId, tierId, slotId);
      if (result.success) {
        setIsRegistered(false);
      }
    } catch (error) {
      console.error("Cancellation error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle claim
  const handleClaim = async () => {
    setLoading(true);
    try {
      const result = await claimTicket(eventId, tierId, slotId);
      if (result.success) {
        setHasClaimed(true);
      }
    } catch (error) {
      console.error("Claim error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Wallet</CardTitle>
          <CardDescription>Please connect your wallet to register for this event</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{eventData?.name || "Event Registration"}</CardTitle>
        <CardDescription>
          Tier {tierId} - {slotId === 0 ? "Premium" : "General"} Slot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Details */}
        {tierData && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price:</span>
              <span className="font-medium">
                {formatUnits(slotId === 0 ? tierData.premiumPrice : tierData.genPrice, 6)} PYUSD
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Max Supply:</span>
              <span className="font-medium">
                {(slotId === 0 ? tierData.premiumMaxSupply : tierData.maxSupply).toString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current Bookings:</span>
              <span className="font-medium">{bookingCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Your PYUSD Balance:</span>
              <span className="font-medium">{formatUnits(pyusdBalance, 6)}</span>
            </div>
          </div>
        )}

        {/* Status Badges */}
        <div className="flex gap-2">
          {isRegistered && <Badge variant="secondary">Registered</Badge>}
          {isWinner && <Badge variant="default">Winner!</Badge>}
          {hasClaimed && <Badge variant="outline">Ticket Claimed</Badge>}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isRegistered && (
            <Button onClick={handleRegister} disabled={loading} className="flex-1">
              {loading ? "Processing..." : "Register for Event"}
            </Button>
          )}

          {isRegistered && !isWinner && (
            <Button onClick={handleCancel} variant="destructive" disabled={loading} className="flex-1">
              {loading ? "Processing..." : "Cancel Registration"}
            </Button>
          )}

          {isWinner && !hasClaimed && (
            <Button onClick={handleClaim} disabled={loading} className="flex-1">
              {loading ? "Processing..." : "Claim Ticket NFT"}
            </Button>
          )}

          {hasClaimed && (
            <Button disabled className="flex-1">
              Ticket Claimed ✓
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>How it works:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Approve PYUSD spending (done automatically)</li>
            <li>Register for the event by staking PYUSD</li>
            <li>Wait for the lottery draw after registration closes</li>
            <li>If you win, claim your ticket NFT</li>
            <li>If you don't win, cancel to get your PYUSD refund + rebate</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}