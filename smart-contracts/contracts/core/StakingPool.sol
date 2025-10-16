// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IEventManager {
    enum EventState { Created, Registration, Drawing, Allocated, Completed, Cancelled }
    enum PoolClass { A, B, C }
    
    function getEvent(uint256 eventId) external view returns (
        address organizer,
        string memory eventName,
        string memory eventMetadataURI,
        uint64 registrationStart,
        uint64 registrationEnd,
        uint64 claimDeadline,
        EventState state,
        uint256 platformFeePercent,
        uint256 rebateAlpha,
        bytes32 vrfRequestId,
        bool vrfFulfilled
    );
    
    function getPool(uint256 eventId, PoolClass poolClass) external view returns (
        uint256 facePrice,
        uint256 quantity,
        uint256 allocated,
        uint256 entrantsCount,
        bool exists
    );
    
    function isPoolEnabled(uint256 eventId, PoolClass poolClass) external view returns (bool);
    function incrementEntrants(uint256 eventId, PoolClass poolClass) external;
}

interface IIdentityVerifier {
    function verifyIdentity(address user, bytes calldata proof) external view returns (bool);
    function getIdentityCommitment(address user, uint256 eventId) external view returns (bytes32);
    function registerIdentity(address user, uint256 eventId, bytes32 commitment, bytes calldata proof) external;
}

/**
 * @title StakingPool
 * @notice Manages user stakes for lottery participation
 * @dev Users stake PYUSD to enter lottery pools
 */
contract StakingPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // ============ Structs ============
    
    struct Stake {
        address user;
        uint256 eventId;
        IEventManager.PoolClass poolClass;
        uint256 stakeAmount;        // facePrice + platformFee
        uint256 facePrice;
        uint256 platformFee;
        bytes32 identityCommitment;
        uint64 stakedAt;
        bool isWinner;
        bool claimed;               // For winners
        bool refunded;              // For losers
    }
    
    struct PoolAccounting {
        uint256 totalStaked;
        uint256 totalFees;
        uint256 winnersStake;
        uint256 losersStake;
        uint256 rebatePool;
    }
    
    // ============ State Variables ============
    
    IERC20 public immutable PYUSD;
    IEventManager public eventManager;
    IIdentityVerifier public identityVerifier;
    address public lotteryEngine;
    
    // Stake tracking
    uint256 private _stakeIdCounter;
    mapping(uint256 => Stake) public stakes;  // stakeId => Stake
    mapping(address => uint256[]) public userStakes;  // user => stakeIds[]
    mapping(uint256 => mapping(IEventManager.PoolClass => uint256[])) public eventPoolStakes;  // eventId => poolClass => stakeIds[]
    
    // Accounting per event per pool
    mapping(uint256 => mapping(IEventManager.PoolClass => PoolAccounting)) public poolAccounting;
    
    // Winner tracking (set by LotteryEngine)
    mapping(uint256 => mapping(address => bool)) public isWinner;  // eventId => user => isWinner
    mapping(uint256 => mapping(IEventManager.PoolClass => address[])) public winners;  // eventId => poolClass => winners[]
    
    // Platform treasury
    address public treasury;
    uint256 public collectedFees;
    
    // ============ Events ============
    
    event Staked(
        uint256 indexed stakeId,
        address indexed user,
        uint256 indexed eventId,
        IEventManager.PoolClass poolClass,
        uint256 stakeAmount,
        bytes32 identityCommitment
    );
    
    event WinnerSet(
        uint256 indexed eventId,
        IEventManager.PoolClass indexed poolClass,
        address indexed user
    );
    
    event TicketClaimed(
        uint256 indexed stakeId,
        address indexed user,
        uint256 indexed eventId
    );
    
    event Refunded(
        uint256 indexed stakeId,
        address indexed user,
        uint256 refundAmount,
        uint256 rebateAmount
    );
    
    event RebatePoolFunded(
        uint256 indexed eventId,
        IEventManager.PoolClass indexed poolClass,
        uint256 amount
    );
    
    event FeesWithdrawn(address indexed treasury, uint256 amount);
    
    // ============ Errors ============
    
    error InvalidAmount();
    error RegistrationNotOpen();
    error RegistrationClosed();
    error PoolNotEnabled();
    error AlreadyStaked();
    error IdentityVerificationFailed();
    error NotWinner();
    error AlreadyClaimed();
    error NotLoser();
    error AlreadyRefunded();
    error Unauthorized();
    error InvalidState();
    error InsufficientBalance();
    
    // ============ Constructor ============
    
    constructor(address _pyusd, address _treasury) Ownable(msg.sender) {
        require(_pyusd != address(0) && _treasury != address(0), "Invalid address");
        PYUSD = IERC20(_pyusd);
        treasury = _treasury;
    }
    
    // ============ Admin Functions ============
    
    function setEventManager(address _eventManager) external onlyOwner {
        require(_eventManager != address(0), "Invalid address");
        eventManager = IEventManager(_eventManager);
    }
    
    function setIdentityVerifier(address _identityVerifier) external onlyOwner {
        require(_identityVerifier != address(0), "Invalid address");
        identityVerifier = IIdentityVerifier(_identityVerifier);
    }

    function setLotteryEngine(address _lotteryEngine) external onlyOwner {
        require(_lotteryEngine != address(0), "Invalid address");
        lotteryEngine = _lotteryEngine;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Stake PYUSD to enter a lottery pool
     * @param eventId The event ID
     * @param poolClass The pool class to enter
     * @param identityProof Zero-knowledge proof for identity verification
     */
    function enterPool(
        uint256 eventId,
        IEventManager.PoolClass poolClass,
        bytes calldata identityProof
    ) external nonReentrant whenNotPaused returns (uint256) {
        // Verify event state
        (,,,,,, IEventManager.EventState state,,,,) = eventManager.getEvent(eventId);
        if (state != IEventManager.EventState.Registration) {
            revert RegistrationNotOpen();
        }
        
        // Verify pool is enabled
        if (!eventManager.isPoolEnabled(eventId, poolClass)) {
            revert PoolNotEnabled();
        }
        
        // Check if user already staked in this event
        uint256[] memory userStakeIds = userStakes[msg.sender];
        for (uint256 i = 0; i < userStakeIds.length; i++) {
            Stake memory stake = stakes[userStakeIds[i]];
            if (stake.eventId == eventId) {
                revert AlreadyStaked();
            }
        }
        
        // Get pool details
        (uint256 facePrice,,,, bool exists) = eventManager.getPool(eventId, poolClass);
        if (!exists) {
            revert PoolNotEnabled();
        }
        
        // Get platform fee
        (,,,,,, , uint256 platformFeePercent,,,) = eventManager.getEvent(eventId);
        uint256 platformFee = (facePrice * platformFeePercent) / 10000;
        uint256 totalStake = facePrice + platformFee;
        
        // Verify and register identity
        bytes32 identityCommitment = identityVerifier.getIdentityCommitment(msg.sender, eventId);
        if (identityCommitment == bytes32(0)) {
            // First time, register identity
            identityCommitment = keccak256(abi.encodePacked(msg.sender, eventId, block.timestamp));
            identityVerifier.registerIdentity(msg.sender, eventId, identityCommitment, identityProof);
        } else {
            // Verify existing identity
            if (!identityVerifier.verifyIdentity(msg.sender, identityProof)) {
                revert IdentityVerificationFailed();
            }
        }
        
        // Transfer PYUSD
        PYUSD.safeTransferFrom(msg.sender, address(this), totalStake);
        
        // Create stake
        uint256 stakeId = _stakeIdCounter++;
        stakes[stakeId] = Stake({
            user: msg.sender,
            eventId: eventId,
            poolClass: poolClass,
            stakeAmount: totalStake,
            facePrice: facePrice,
            platformFee: platformFee,
            identityCommitment: identityCommitment,
            stakedAt: uint64(block.timestamp),
            isWinner: false,
            claimed: false,
            refunded: false
        });
        
        userStakes[msg.sender].push(stakeId);
        eventPoolStakes[eventId][poolClass].push(stakeId);
        
        // Update accounting
        PoolAccounting storage accounting = poolAccounting[eventId][poolClass];
        accounting.totalStaked += totalStake;
        accounting.totalFees += platformFee;
        
        // Notify EventManager
        eventManager.incrementEntrants(eventId, poolClass);
        
        emit Staked(stakeId, msg.sender, eventId, poolClass, totalStake, identityCommitment);
        
        return stakeId;
    }
    
    /**
     * @notice Mark winners (called by LotteryEngine)
     */
    function setWinners(
        uint256 eventId,
        IEventManager.PoolClass poolClass,
        address[] calldata _winners
    ) external {
        // Only lottery engine can call
        if (msg.sender != lotteryEngine) {
            revert Unauthorized();
        }
        
        for (uint256 i = 0; i < _winners.length; i++) {
            address winner = _winners[i];
            isWinner[eventId][winner] = true;
            winners[eventId][poolClass].push(winner);
            
            // Find and mark stake as winner
            uint256[] memory userStakeIds = userStakes[winner];
            for (uint256 j = 0; j < userStakeIds.length; j++) {
                Stake storage stake = stakes[userStakeIds[j]];
                if (stake.eventId == eventId && stake.poolClass == poolClass) {
                    stake.isWinner = true;
                    poolAccounting[eventId][poolClass].winnersStake += stake.stakeAmount;
                    break;
                }
            }
            
            emit WinnerSet(eventId, poolClass, winner);
        }
    }
    
    /**
     * @notice Winners claim their ticket (funds stay in contract, ticket NFT minted)
     */
    function claimTicket(uint256 stakeId) external nonReentrant {
        Stake storage stake = stakes[stakeId];
        
        if (stake.user != msg.sender) {
            revert Unauthorized();
        }
        if (!stake.isWinner) {
            revert NotWinner();
        }
        if (stake.claimed) {
            revert AlreadyClaimed();
        }
        
        // Verify event is in Allocated state
        (,,,,,, IEventManager.EventState state,,,,) = eventManager.getEvent(stake.eventId);
        if (state != IEventManager.EventState.Allocated && state != IEventManager.EventState.Completed) {
            revert InvalidState();
        }
        
        stake.claimed = true;
        
        // Funds remain in contract (organizer withdraws later)
        // Ticket NFT is minted by TicketNFT contract (separate call)
        
        emit TicketClaimed(stakeId, msg.sender, stake.eventId);
    }
    
    /**
     * @notice Fund rebate pool for an event/pool (called after lottery)
     */
    function fundRebatePool(uint256 eventId, IEventManager.PoolClass poolClass) external {
        (,,,,,, IEventManager.EventState state, , uint256 rebateAlpha,,) = eventManager.getEvent(eventId);
        
        if (state != IEventManager.EventState.Allocated && state != IEventManager.EventState.Completed) {
            revert InvalidState();
        }
        
        PoolAccounting storage accounting = poolAccounting[eventId][poolClass];
        
        if (accounting.rebatePool > 0) {
            return; // Already funded
        }
        
        // Calculate rebate pool from fees
        uint256 rebateAmount = (accounting.totalFees * rebateAlpha) / 10000;
        accounting.rebatePool = rebateAmount;
        
        emit RebatePoolFunded(eventId, poolClass, rebateAmount);
    }
    
    /**
     * @notice Non-winners claim refund + rebate
     */
    function claimRefund(uint256 stakeId) external nonReentrant {
        Stake storage stake = stakes[stakeId];
        
        if (stake.user != msg.sender) {
            revert Unauthorized();
        }
        if (stake.isWinner) {
            revert NotLoser();
        }
        if (stake.refunded) {
            revert AlreadyRefunded();
        }
        
        // Verify event is in Allocated or Completed state
        (,,,,,, IEventManager.EventState state,,,,) = eventManager.getEvent(stake.eventId);
        if (state != IEventManager.EventState.Allocated && state != IEventManager.EventState.Completed) {
            revert InvalidState();
        }
        
        stake.refunded = true;
        
        // Calculate refund
        uint256 baseRefund = stake.facePrice; // Return face price (platform fee stays)
        
        // Calculate rebate share
        PoolAccounting storage accounting = poolAccounting[stake.eventId][stake.poolClass];
        uint256[] memory poolStakes = eventPoolStakes[stake.eventId][stake.poolClass];
        
        uint256 losersCount = 0;
        for (uint256 i = 0; i < poolStakes.length; i++) {
            if (!stakes[poolStakes[i]].isWinner) {
                losersCount++;
            }
        }
        
        uint256 rebateShare = 0;
        if (losersCount > 0 && accounting.rebatePool > 0) {
            rebateShare = accounting.rebatePool / losersCount;
        }
        
        uint256 totalRefund = baseRefund + rebateShare;
        
        // Transfer refund
        if (totalRefund > 0) {
            PYUSD.safeTransfer(msg.sender, totalRefund);
        }
        
        emit Refunded(stakeId, msg.sender, baseRefund, rebateShare);
    }
    
    /**
     * @notice Withdraw platform fees to treasury
     */
    function withdrawFees(uint256 eventId, IEventManager.PoolClass poolClass) external onlyOwner {
        PoolAccounting storage accounting = poolAccounting[eventId][poolClass];

        (,,,,,, IEventManager.EventState state, , uint256 rebateAlpha,,) = eventManager.getEvent(eventId);
        if (state != IEventManager.EventState.Completed) {
            revert InvalidState();
        }
        
        // Calculate withdrawable fees (total fees - rebate pool)
        uint256 withdrawable = (accounting.totalFees * (10000 - rebateAlpha)) / 10000;
        
        if (withdrawable > 0) {
            collectedFees += withdrawable;
            PYUSD.safeTransfer(treasury, withdrawable);
            
            emit FeesWithdrawn(treasury, withdrawable);
        }
    }
    
    /**
     * @notice Organizer withdraws winner stakes (face prices)
     */
    function withdrawWinnerFunds(uint256 eventId, IEventManager.PoolClass poolClass) external {
        (address organizer,,,,,, IEventManager.EventState state,,,,) = eventManager.getEvent(eventId);
        
        if (msg.sender != organizer) {
            revert Unauthorized();
        }
        
        if (state != IEventManager.EventState.Completed) {
            revert InvalidState();
        }
        
        PoolAccounting storage accounting = poolAccounting[eventId][poolClass];
        uint256 withdrawable = accounting.winnersStake;
        
        if (withdrawable > 0) {
            accounting.winnersStake = 0;
            PYUSD.safeTransfer(organizer, withdrawable);
        }
    }
    
    // ============ View Functions ============
    
    function getStake(uint256 stakeId) external view returns (Stake memory) {
        return stakes[stakeId];
    }
    
    function getUserStakes(address user) external view returns (uint256[] memory) {
        return userStakes[user];
    }
    
    function getEventPoolStakes(uint256 eventId, IEventManager.PoolClass poolClass) external view returns (uint256[] memory) {
        return eventPoolStakes[eventId][poolClass];
    }
    
    function getWinners(uint256 eventId, IEventManager.PoolClass poolClass) external view returns (address[] memory) {
        return winners[eventId][poolClass];
    }
    
    function getPoolAccounting(uint256 eventId, IEventManager.PoolClass poolClass) external view returns (PoolAccounting memory) {
        return poolAccounting[eventId][poolClass];
    }
}
