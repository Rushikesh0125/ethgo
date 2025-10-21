// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Core event contract
/// @author @Rushikesh0125 
/// @notice Contract that handles the core event logic like - accepting pyusd, fetching feeds, fetching randomness, ticket claims 
contract Event {


    event BookingRegistered(uint256 indexed tierId, uint256 indexed slot, address indexed user);
    event BookingUnregistered(uint256 indexed tierId, uint256 indexed slot, address indexed user, uint256 refundAmount);

    error NameCannotBeEmpty();
    error ZeroAddress(string);
    error InvalidData(string);
    error ZeroPrice();
    error ZeroSupply();
    error Unauthorized();

    struct EventData {
        string name;
        uint256 saleStartTime;
        uint256 saleEndTime;
        uint256 revealTime;
    }

    struct TierData {
        uint256 genPrice;
        uint256 premiumPrice;
        uint256 maxSupply;
        uint256 premiumMaxSupply;
        uint256 genSeed;
        uint256 premiumSeed;
    }

    struct TierBookingMetric {
        uint256 totalBookings;
        uint256 totalPremiumBookings;
        uint256 totalGenBookings;
    }

    struct UserBooking {
       uint256 genIndex;
       uint256 premiumIndex;
    }

    string name;

    IERC20 public pyusd;

    uint256 saleStartTime;
    uint256 saleEndTime;
    uint256 revealTime;

    uint256 totalBookings;
    uint256 totalPooledUsd;

    address public routerAddress;
    address owner;

    mapping (uint256 tierId => TierData tierData) tierData;
    mapping (uint256 tierId => TierBookingMetric tierBookingMetric) tierBookingMetric;
    mapping (uint256 tierId => mapping(uint256 slot => address[] users)) usersByTier; // premium slot 0, gen slot 1
    mapping (address user => mapping(uint256 tierId => UserBooking userBookings)) userBookingsByTier;


    modifier OnlyRouter {
        if (msg.sender != routerAddress) revert Unauthorized();
        _;
    }

    modifier OnlyOwner {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(
        address _pyUsd,
        address _routerAddress,
        address _owner,
        EventData memory _eventData,
        uint256[] memory _tierIds,
        TierData[] memory _tierDataArray
    ) {
        if (bytes(_eventData.name).length == 0) revert NameCannotBeEmpty();
        if (_pyUsd == address(0)) revert ZeroAddress("PYUSD");
        if (_routerAddress == address(0)) revert ZeroAddress("Router");
        if (_owner == address(0)) revert ZeroAddress("Owner");
        if (_eventData.saleStartTime == 0) revert InvalidData("SaleStartTime");
        if (_eventData.saleEndTime <= _eventData.saleStartTime) revert InvalidData("_saleEndTime <= _saleStartTime");
        if (_eventData.revealTime <= _eventData.saleEndTime) revert InvalidData("_revealTime <= _saleEndTime");
        if (_tierIds.length == 0) revert InvalidData("No tiers provided");
        if (_tierIds.length != _tierDataArray.length) revert InvalidData("length mismatch");

        name = _eventData.name;
        pyusd = IERC20(_pyUsd);
        routerAddress = _routerAddress;
        owner = _owner;
        saleStartTime = _eventData.saleStartTime;
        saleEndTime = _eventData.saleEndTime;
        revealTime = _eventData.revealTime;

        for (uint256 i = 0; i < _tierIds.length; i++) {
            uint256 tierId = _tierIds[i];
            TierData memory data = _tierDataArray[i];
            
            if (data.genPrice == 0) revert ZeroPrice();
            if (data.premiumPrice == 0) revert ZeroPrice();
            if (data.maxSupply == 0) revert ZeroSupply();

            if (data.premiumMaxSupply == 0) revert InvalidData("PremiumMaxSupply");
            if (tierData[tierId].maxSupply != 0) revert InvalidData("Duplicate tier ID");

            tierData[tierId] = data;
        }
    }


    function setRouterAddress(address _routerAddress) external OnlyOwner {
        if (_routerAddress == address(0)) revert ZeroAddress("Router");
        routerAddress = _routerAddress;
    }

    function setOwner(address _owner) external OnlyOwner {
        if (_owner == address(0)) revert ZeroAddress("Owner");
        owner = _owner;
    }

    function getBookingMetric(uint256 tierId) external view returns (TierBookingMetric memory) {
        return tierBookingMetric[tierId];
    }

    function RegisterBooking(uint256 tierId, uint256 slot, address user) external OnlyRouter {
        if (block.timestamp < saleStartTime || block.timestamp >= saleEndTime) revert InvalidData("Sale not active");
        if(slot > 1) revert InvalidData("Invalid slot");
        if(user == address(0)) revert ZeroAddress("User");

        TierData memory tierDataInfo = tierData[tierId];
        if(tierDataInfo.maxSupply == 0) revert InvalidData("Tier not found");

        TierBookingMetric storage bookingMetric = tierBookingMetric[tierId];
        
        UserBooking memory userBooking = userBookingsByTier[user][tierId];
        if(userBooking.genIndex != 0 && slot == 1) revert InvalidData("Duplicate booking");
        if(userBooking.premiumIndex != 0 && slot == 0) revert InvalidData("Duplicate booking");

        bookingMetric.totalBookings++;
        if(slot == 0){
            totalPooledUsd += tierDataInfo.premiumPrice;
            bookingMetric.totalPremiumBookings++;
            userBooking.premiumIndex = usersByTier[tierId][slot].length + 1;
        } else {
            totalPooledUsd += tierDataInfo.genPrice;
            bookingMetric.totalGenBookings++;
            userBooking.genIndex = usersByTier[tierId][slot].length + 1;
        }
        
        userBookingsByTier[user][tierId] = userBooking;
        usersByTier[tierId][slot].push(user);

        emit BookingRegistered(tierId, slot, user);
    }

    function unregisterBooking(uint256 tierId, uint256 slot, address user) external OnlyRouter {
        if (block.timestamp >= saleEndTime) revert InvalidData("Sale ended");
        if(slot > 1) revert InvalidData("Invalid slot");
        if(user == address(0)) revert ZeroAddress("User");

        TierData memory tierDataInfo = tierData[tierId];
        if(tierDataInfo.maxSupply == 0) revert InvalidData("Tier not found");

        TierBookingMetric storage bookingMetric = tierBookingMetric[tierId];
        
        // Get user booking info
        UserBooking memory userBooking = userBookingsByTier[user][tierId];
        
        // Check if user has a booking in this slot and get the index
        uint256 userIndex;
        if(slot == 0) {
            if(userBooking.premiumIndex == 0) revert InvalidData("No premium booking found");
            userIndex = userBooking.premiumIndex - 1;
        } else {
            if(userBooking.genIndex == 0) revert InvalidData("No gen booking found");
            userIndex = userBooking.genIndex - 1;
        }

        // Verify the user is actually at this index
        address[] storage usersInSlot = usersByTier[tierId][slot];
        if(userIndex >= usersInSlot.length || usersInSlot[userIndex] != user) {
            revert InvalidData("User index mismatch");
        }

        // Decrease booking counts
        bookingMetric.totalBookings--;
        if(slot == 0) {
            totalPooledUsd -= tierDataInfo.premiumPrice;
            bookingMetric.totalPremiumBookings--;
        } else {
            totalPooledUsd -= tierDataInfo.genPrice;
            bookingMetric.totalGenBookings--;
        }

        // Remove user from the array using swap and pop
        address lastUser = usersInSlot[usersInSlot.length - 1];
        usersInSlot[userIndex] = lastUser;
        usersInSlot.pop();

        // Update the index of the swapped user in userBookingsByTier
        address swappedUser = lastUser;
        if(swappedUser != address(0)) {
            UserBooking storage swappedUserBooking = userBookingsByTier[swappedUser][tierId];
            if(slot == 0) {
                swappedUserBooking.premiumIndex = userIndex + 1;
            } else {
                swappedUserBooking.genIndex = userIndex + 1;
            }
        }

        // Clear user's booking record only if they have no bookings in either slot
        UserBooking storage remainingUserBooking = userBookingsByTier[user][tierId];
        if(slot == 0) {
            remainingUserBooking.premiumIndex = 0; // Clear premium booking
            // Only delete the entire record if no gen booking exists
            if(remainingUserBooking.genIndex == 0) {
                delete userBookingsByTier[user][tierId];
            }
        } else {
            remainingUserBooking.genIndex = 0; // Clear gen booking
            // Only delete the entire record if no premium booking exists
            if(remainingUserBooking.premiumIndex == 0) {
                delete userBookingsByTier[user][tierId];
            }
        }

        // Transfer PyUSD back to user
        uint256 refundAmount = slot == 0 ? tierDataInfo.premiumPrice : tierDataInfo.genPrice;
        bool success = pyusd.transfer(user, refundAmount);
        require(success, "PyUSD transfer failed");

        emit BookingUnregistered(tierId, slot, user, refundAmount);
    }

    function seedAllotment(uint256 tierId, uint256 genSeed, uint256 premiumSeed) external OnlyRouter {
        if (block.timestamp < saleEndTime) revert InvalidData("Sale ongoing");
        if(genSeed == 0) revert InvalidData("GenSeed 0");
        if(premiumSeed == 0) revert InvalidData("PremiumSeed 0");

        TierData memory tierDataInfo = tierData[tierId];
        if(tierDataInfo.maxSupply == 0) revert InvalidData("Tier not found");

        tierDataInfo.genSeed = genSeed;
        tierDataInfo.premiumSeed = premiumSeed;
        tierData[tierId] = tierDataInfo;
    }


    function isAlloted(address user, uint256 tierId) external view returns (bool) {
        if (block.timestamp < revealTime) revert InvalidData("Not revealed yet");

        TierData memory td = tierData[tierId];
        if (td.maxSupply == 0) revert InvalidData("Tier not found");
        if (td.genSeed == 0 || td.premiumSeed == 0) revert InvalidData("Not seeded");

        UserBooking memory ub = userBookingsByTier[user][tierId];

        bool premiumBooked = ub.premiumIndex != 0;
        bool genBooked = ub.genIndex != 0;

        if (!premiumBooked && !genBooked) return false;

        bool premiumWin = premiumBooked && _isWinner(tierId, 0, user);
        bool genWin = genBooked && _isWinner(tierId, 1, user);

        return premiumWin || genWin;
    }

    function _isWinner(uint256 tierId, uint256 slot, address user) internal view returns (bool) {
        address[] storage users = usersByTier[tierId][slot];
        uint256 num = users.length;
        if (num == 0) return false;

        uint256 seed = slot == 0 ? tierData[tierId].premiumSeed : tierData[tierId].genSeed;
        uint256 available = slot == 0 ? tierData[tierId].premiumMaxSupply : tierData[tierId].maxSupply - tierData[tierId].premiumMaxSupply;

        if (available >= num) return true;
        if (available == 0) return false;

        uint256 myScore = uint256(keccak256(abi.encodePacked(seed, user)));
        uint256 better = 0;

        for (uint256 i = 0; i < num; i++) {
            address u = users[i];
            if (u == user) continue;
            uint256 score = uint256(keccak256(abi.encodePacked(seed, u)));
            if (score < myScore || (score == myScore && u < user)) better++;
        }

        return better < available;
    }


    
}