// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

interface IEvent {
    struct TierBookingMetric {
        uint256 totalBookings;
        uint256 totalPremiumBookings;
        uint256 totalGenBookings;
    }

    function RegisterBooking(uint256 tierId, uint256 slot, address user) external;
    function unregisterBooking(uint256 tierId, uint256 slot, address user) external;
    function seedAllotment(uint256 tierId, uint256 genSeed, uint256 premiumSeed) external;
    function getBookingMetric(uint256 tierId) external view returns (TierBookingMetric memory);
    function isAlloted(address user, uint256 tierId) external view returns (bool);
}

/// @title EventRouter contract will be used to route the calls to the correct event contract
/// @author @Rushikesh0125 
/// @notice Contract to route the calls to the correct event contract

contract EventRouter is IEntropyConsumer {
    error Unauthorized();
    error ZeroAddress(string);
    error InvalidEvent();
    error InvalidData(string);

    address public factory;
    address public owner;
    uint256 public nextEventId;

    IEntropyV2 public entropyV2;

    mapping(uint256 => address) public eventAddresses;
    mapping(uint256 => address) public ticketNFTAddresses;

    // Add struct and mapping for pending seeds
    struct PendingSeed {
        uint256 eventId;
        uint256 tierId;
    }

    mapping(uint64 => PendingSeed) public pendingSeeds;

    modifier onlyFactory() {
        if (msg.sender != factory) revert Unauthorized();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _entropyV2) {
        if (_entropyV2 == address(0)) revert ZeroAddress("EntropyV2");
        owner = msg.sender; // Set initial owner
        entropyV2 = IEntropyV2(_entropyV2);
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
    }

    function registerEvent(
        address eventAddr,
        address ticketNFTAddr
    ) external onlyFactory returns (uint256 eventId) {
        if (eventAddr == address(0) || ticketNFTAddr == address(0))
            revert InvalidEvent();
        eventId = nextEventId++;
        eventAddresses[eventId] = eventAddr;
        ticketNFTAddresses[eventId] = ticketNFTAddr;
    }

    // Routed functions
    function registerBooking(
        uint256 eventId,
        uint256 tierId,
        uint256 slot
    ) external {
        address eventAddr = eventAddresses[eventId];
        if (eventAddr == address(0)) revert InvalidEvent();
        IEvent(eventAddr).RegisterBooking(tierId, slot, msg.sender);
    }

    function unregisterBooking(
        uint256 eventId,
        uint256 tierId,
        uint256 slot
    ) external {
        address eventAddr = eventAddresses[eventId];
        if (eventAddr == address(0)) revert InvalidEvent();
        IEvent(eventAddr).unregisterBooking(tierId, slot, msg.sender);
    }

    function seedAllotment(
        uint256 eventId,
        uint256 tierId,
        uint256 genSeed,
        uint256 premiumSeed
    ) external onlyOwner {
        // Adjust modifier if VRF callback
        address eventAddr = eventAddresses[eventId];
        if (eventAddr == address(0)) revert InvalidEvent();
        IEvent(eventAddr).seedAllotment(tierId, genSeed, premiumSeed);
    }

    function getBookingMetric(
        uint256 eventId,
        uint256 tierId
    ) external view returns (IEvent.TierBookingMetric memory) {
        address eventAddr = eventAddresses[eventId];
        if (eventAddr == address(0)) revert InvalidEvent();
        IEvent.TierBookingMetric memory metric = IEvent(eventAddr)
            .getBookingMetric(tierId);
        return metric;
    }

    function isAlloted(
        uint256 eventId,
        address user,
        uint256 tierId
    ) external view returns (bool) {
        address eventAddr = eventAddresses[eventId];
        if (eventAddr == address(0)) revert InvalidEvent();
        return IEvent(eventAddr).isAlloted(user, tierId);
    }

    function requestRandomNumber() external payable {
        uint256 fee = entropyV2.getFeeV2();
        
        uint64 sequenceNumber = entropyV2.requestV2{ value: fee }();
    }

    function requestSeedAllotmentForEvent(uint256 eventId, uint256[] memory tierIds) external onlyOwner payable {
        address eventAddr = eventAddresses[eventId];
        if (eventAddr == address(0)) revert InvalidEvent();
        uint256 numTiers = tierIds.length;
        if (numTiers == 0) revert InvalidData("No tiers");
    
        uint256 fee = entropyV2.getFeeV2();
        uint256 totalFee = fee * numTiers;
        if (msg.value < totalFee) revert InvalidData("Insufficient fee");
    
        for (uint256 i = 0; i < numTiers; i++) {
            uint64 sequence = entropyV2.requestV2{value: fee}();
            pendingSeeds[sequence] = PendingSeed(eventId, tierIds[i]);
        }
    
        // Refund excess
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }
    }
 

    // Add other routed functions as needed, e.g., setRouterAddress if applicable
    function getEntropy() internal view virtual override returns (address) {
        return address(entropyV2);
    }

    function entropyCallback(
        uint64 sequence,
        address provider,
        bytes32 randomNumber
    ) internal virtual override {
        PendingSeed memory pend = pendingSeeds[sequence];
        if (pend.eventId == 0) revert InvalidData("Unknown sequence");
    
        // Derive two seeds from randomNumber
        uint256 genSeed = uint256(randomNumber);
        uint256 premiumSeed = uint256(keccak256(abi.encodePacked(randomNumber, pend.tierId)));
    
        address eventAddr = eventAddresses[pend.eventId];
        if (eventAddr == address(0)) revert InvalidEvent();
    
        IEvent(eventAddr).seedAllotment(pend.tierId, genSeed, premiumSeed);
    
        // Clean up
        delete pendingSeeds[sequence];
    }
}
