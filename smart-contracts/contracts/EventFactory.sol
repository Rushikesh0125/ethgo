// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./Event.sol";
import "./TicketNFT.sol";

// Add interface
interface IEventRouter {
    function registerEvent(address eventAddr, address ticketNFTAddr) external returns (uint256);
}

/// @title EventFactory contract creates and event and mints a NFT ticket contract for the event 
/// @author @Rushikesh0125 
/// @notice Contract to create events
contract EventFactory is Ownable {
    
    address public immutable pyusd;
    address public immutable router;

    constructor(address _pyusd, address _router) Ownable(msg.sender) {
        pyusd = _pyusd;
        router = _router;
    }

    function createEvent(
        string memory _name,
        uint256 _saleStartTime,
        uint256 _saleEndTime,
        uint256 _revealTime,
        uint256[] memory _tierIds,
        Event.TierData[] memory _tierDataArray,
        string memory _metadataUri
    ) external onlyOwner returns (uint256) {
        uint256 numTiers = _tierIds.length;
        if (numTiers != _tierDataArray.length) revert("Mismatch in tier lengths");

        // Create maxSupplies for TicketNFT
        uint256[] memory maxSupplies = new uint256[](numTiers);
        for (uint256 i = 0; i < numTiers; i++) {
            maxSupplies[i] = _tierDataArray[i].maxSupply;
        }

        // Deploy TicketNFT with minter as router
        TicketNFT ticket = new TicketNFT(_metadataUri, router, _tierIds, maxSupplies);

        // Create EventData struct
        Event.EventData memory eventData = Event.EventData({
            name: _name,
            saleStartTime: _saleStartTime,
            saleEndTime: _saleEndTime,
            revealTime: _revealTime
        });

        // Deploy Event contract
        Event newEvent = new Event(
            pyusd,
            router,
            msg.sender,
            eventData,
            _tierIds,
            _tierDataArray
        );

        // Register with router
        uint256 eventId = IEventRouter(router).registerEvent(address(newEvent), address(ticket));

        return eventId;
    }
}