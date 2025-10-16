// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EventManager
 * @notice Manages event creation, ticket pools, and event lifecycle
 * @dev Organizers create events with multiple ticket pools (A/B/C classes)
 */
contract EventManager is Ownable, ReentrancyGuard, Pausable {
    
    // ============ Enums ============
    
    enum EventState {
        Created,        // Event created, registration not started
        Registration,   // Registration window open
        Drawing,        // Registration closed, drawing in progress
        Allocated,      // Winners selected, claims open
        Completed,      // Event completed
        Cancelled       // Event cancelled
    }
    
    enum PoolClass {
        A,
        B,
        C
    }
    
    // ============ Structs ============
    
    struct TicketPool {
        PoolClass class;
        uint256 facePrice;          // Price in PYUSD (6 decimals)
        uint256 quantity;           // Total tickets available
        uint256 allocated;          // Tickets allocated
        uint256 entrantsCount;      // Number of participants
        bool exists;
    }
    
    struct Event {
        uint256 eventId;
        address organizer;
        string eventName;
        string eventMetadataURI;    // IPFS hash
        uint64 registrationStart;
        uint64 registrationEnd;
        uint64 claimDeadline;
        EventState state;
        uint256 platformFeePercent; // Basis points (100 = 1%)
        uint256 rebateAlpha;        // Basis points for rebate pool allocation
        bytes32 vrfRequestId;       // Pyth Entropy request ID
        bool vrfFulfilled;
        mapping(PoolClass => TicketPool) pools;
        bool poolAEnabled;
        bool poolBEnabled;
        bool poolCEnabled;
    }
    
    // ============ State Variables ============
    
    uint256 private _eventIdCounter;
    mapping(uint256 => Event) private _events;
    mapping(address => uint256[]) private _organizerEvents;
    
    // Platform settings
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    uint256 public constant MAX_REBATE_ALPHA = 5000; // 50% max
    uint256 public constant BASIS_POINTS = 10000;
    
    address public stakingPoolContract;
    address public lotteryEngineContract;
    address public identityVerifierContract;
    
    // ============ Events ============
    
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string eventName,
        uint64 registrationStart,
        uint64 registrationEnd
    );
    
    event PoolConfigured(
        uint256 indexed eventId,
        PoolClass indexed poolClass,
        uint256 facePrice,
        uint256 quantity
    );
    
    event EventStateChanged(
        uint256 indexed eventId,
        EventState oldState,
        EventState newState
    );
    
    event RegistrationOpened(uint256 indexed eventId, uint64 timestamp);
    event RegistrationClosed(uint256 indexed eventId, uint64 timestamp);
    event DrawRequested(uint256 indexed eventId, bytes32 vrfRequestId);
    event DrawCompleted(uint256 indexed eventId);
    
    // ============ Errors ============
    
    error InvalidTimeWindow();
    error InvalidFeeConfiguration();
    error InvalidPoolConfiguration();
    error EventDoesNotExist();
    error UnauthorizedOrganizer();
    error InvalidEventState();
    error ContractNotSet();
    error PoolNotEnabled();
    
    // ============ Modifiers ============
    
    modifier onlyOrganizer(uint256 eventId) {
        if (_events[eventId].organizer != msg.sender && owner() != msg.sender) {
            revert UnauthorizedOrganizer();
        }
        _;
    }
    
    modifier eventExists(uint256 eventId) {
        if (_events[eventId].organizer == address(0)) {
            revert EventDoesNotExist();
        }
        _;
    }
    
    modifier inState(uint256 eventId, EventState requiredState) {
        if (_events[eventId].state != requiredState) {
            revert InvalidEventState();
        }
        _;
    }
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set the StakingPool contract address
     */
    function setStakingPoolContract(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "Invalid address");
        stakingPoolContract = _stakingPool;
    }
    
    /**
     * @notice Set the LotteryEngine contract address
     */
    function setLotteryEngineContract(address _lotteryEngine) external onlyOwner {
        require(_lotteryEngine != address(0), "Invalid address");
        lotteryEngineContract = _lotteryEngine;
    }
    
    /**
     * @notice Set the IdentityVerifier contract address
     */
    function setIdentityVerifierContract(address _identityVerifier) external onlyOwner {
        require(_identityVerifier != address(0), "Invalid address");
        identityVerifierContract = _identityVerifier;
    }
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ Event Creation ============
    
    /**
     * @notice Create a new event with ticket pools
     * @param eventName Name of the event
     * @param eventMetadataURI IPFS hash for event details
     * @param registrationStart Unix timestamp for registration start
     * @param registrationEnd Unix timestamp for registration end
     * @param claimDeadline Unix timestamp for claim deadline
     * @param platformFeePercent Platform fee in basis points
     * @param rebateAlpha Rebate pool allocation in basis points
     */
    function createEvent(
        string calldata eventName,
        string calldata eventMetadataURI,
        uint64 registrationStart,
        uint64 registrationEnd,
        uint64 claimDeadline,
        uint256 platformFeePercent,
        uint256 rebateAlpha
    ) external whenNotPaused returns (uint256) {
        // Validate time windows
        if (registrationStart >= registrationEnd || registrationEnd >= claimDeadline) {
            revert InvalidTimeWindow();
        }
        if (registrationStart < block.timestamp) {
            revert InvalidTimeWindow();
        }
        
        // Validate fees
        if (platformFeePercent > MAX_PLATFORM_FEE || rebateAlpha > MAX_REBATE_ALPHA) {
            revert InvalidFeeConfiguration();
        }
        
        uint256 eventId = _eventIdCounter++;
        
        Event storage newEvent = _events[eventId];
        newEvent.eventId = eventId;
        newEvent.organizer = msg.sender;
        newEvent.eventName = eventName;
        newEvent.eventMetadataURI = eventMetadataURI;
        newEvent.registrationStart = registrationStart;
        newEvent.registrationEnd = registrationEnd;
        newEvent.claimDeadline = claimDeadline;
        newEvent.state = EventState.Created;
        newEvent.platformFeePercent = platformFeePercent;
        newEvent.rebateAlpha = rebateAlpha;
        
        _organizerEvents[msg.sender].push(eventId);
        
        emit EventCreated(
            eventId,
            msg.sender,
            eventName,
            registrationStart,
            registrationEnd
        );
        
        return eventId;
    }
    
    /**
     * @notice Configure a ticket pool for an event
     * @param eventId The event ID
     * @param poolClass The pool class (A, B, or C)
     * @param facePrice Price in PYUSD (6 decimals)
     * @param quantity Number of tickets available
     */
    function configurePool(
        uint256 eventId,
        PoolClass poolClass,
        uint256 facePrice,
        uint256 quantity
    ) external eventExists(eventId) onlyOrganizer(eventId) inState(eventId, EventState.Created) {
        if (facePrice == 0 || quantity == 0) {
            revert InvalidPoolConfiguration();
        }
        
        Event storage evt = _events[eventId];
        TicketPool storage pool = evt.pools[poolClass];
        
        pool.class = poolClass;
        pool.facePrice = facePrice;
        pool.quantity = quantity;
        pool.allocated = 0;
        pool.entrantsCount = 0;
        pool.exists = true;
        
        // Enable pool
        if (poolClass == PoolClass.A) {
            evt.poolAEnabled = true;
        } else if (poolClass == PoolClass.B) {
            evt.poolBEnabled = true;
        } else {
            evt.poolCEnabled = true;
        }
        
        emit PoolConfigured(eventId, poolClass, facePrice, quantity);
    }
    
    // ============ Event Lifecycle ============
    
    /**
     * @notice Start registration for an event
     */
    function openRegistration(uint256 eventId) 
        external 
        eventExists(eventId) 
        onlyOrganizer(eventId) 
        inState(eventId, EventState.Created) 
    {
        Event storage evt = _events[eventId];
        
        if (block.timestamp < evt.registrationStart) {
            revert InvalidEventState();
        }
        
        // Ensure at least one pool is configured
        if (!evt.poolAEnabled && !evt.poolBEnabled && !evt.poolCEnabled) {
            revert InvalidPoolConfiguration();
        }
        
        EventState oldState = evt.state;
        evt.state = EventState.Registration;
        
        emit EventStateChanged(eventId, oldState, EventState.Registration);
        emit RegistrationOpened(eventId, uint64(block.timestamp));
    }
    
    /**
     * @notice Close registration and prepare for drawing
     */
    function closeRegistration(uint256 eventId) 
        external 
        eventExists(eventId) 
        inState(eventId, EventState.Registration) 
    {
        if (lotteryEngineContract == address(0)) {
            revert ContractNotSet();
        }
        
        Event storage evt = _events[eventId];
        
        if (block.timestamp < evt.registrationEnd) {
            revert InvalidEventState();
        }
        
        EventState oldState = evt.state;
        evt.state = EventState.Drawing;
        
        emit EventStateChanged(eventId, oldState, EventState.Drawing);
        emit RegistrationClosed(eventId, uint64(block.timestamp));
    }
    
    /**
     * @notice Mark event as allocated after lottery draw
     * @dev Called by LotteryEngine contract
     */
    function markAllocated(uint256 eventId, bytes32 vrfRequestId) 
        external 
        eventExists(eventId) 
        inState(eventId, EventState.Drawing) 
    {
        if (msg.sender != lotteryEngineContract) {
            revert UnauthorizedOrganizer();
        }
        
        Event storage evt = _events[eventId];
        evt.vrfRequestId = vrfRequestId;
        evt.vrfFulfilled = true;
        
        EventState oldState = evt.state;
        evt.state = EventState.Allocated;
        
        emit EventStateChanged(eventId, oldState, EventState.Allocated);
        emit DrawCompleted(eventId);
    }
    
    /**
     * @notice Complete event after claim deadline
     */
    function completeEvent(uint256 eventId) 
        external 
        eventExists(eventId) 
        onlyOrganizer(eventId) 
        inState(eventId, EventState.Allocated) 
    {
        Event storage evt = _events[eventId];
        
        if (block.timestamp < evt.claimDeadline) {
            revert InvalidEventState();
        }
        
        EventState oldState = evt.state;
        evt.state = EventState.Completed;
        
        emit EventStateChanged(eventId, oldState, EventState.Completed);
    }
    
    /**
     * @notice Cancel an event (only before registration closes)
     */
    function cancelEvent(uint256 eventId) 
        external 
        eventExists(eventId) 
        onlyOrganizer(eventId) 
    {
        Event storage evt = _events[eventId];
        
        if (evt.state != EventState.Created && evt.state != EventState.Registration) {
            revert InvalidEventState();
        }
        
        EventState oldState = evt.state;
        evt.state = EventState.Cancelled;
        
        emit EventStateChanged(eventId, oldState, EventState.Cancelled);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get event details
     */
    function getEvent(uint256 eventId) 
        external 
        view 
        eventExists(eventId) 
        returns (
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
        ) 
    {
        Event storage evt = _events[eventId];
        return (
            evt.organizer,
            evt.eventName,
            evt.eventMetadataURI,
            evt.registrationStart,
            evt.registrationEnd,
            evt.claimDeadline,
            evt.state,
            evt.platformFeePercent,
            evt.rebateAlpha,
            evt.vrfRequestId,
            evt.vrfFulfilled
        );
    }
    
    /**
     * @notice Get pool details
     */
    function getPool(uint256 eventId, PoolClass poolClass) 
        external 
        view 
        eventExists(eventId) 
        returns (
            uint256 facePrice,
            uint256 quantity,
            uint256 allocated,
            uint256 entrantsCount,
            bool exists
        ) 
    {
        TicketPool storage pool = _events[eventId].pools[poolClass];
        return (
            pool.facePrice,
            pool.quantity,
            pool.allocated,
            pool.entrantsCount,
            pool.exists
        );
    }
    
    /**
     * @notice Check if pool is enabled
     */
    function isPoolEnabled(uint256 eventId, PoolClass poolClass) 
        external 
        view 
        eventExists(eventId) 
        returns (bool) 
    {
        Event storage evt = _events[eventId];
        if (poolClass == PoolClass.A) return evt.poolAEnabled;
        if (poolClass == PoolClass.B) return evt.poolBEnabled;
        return evt.poolCEnabled;
    }
    
    /**
     * @notice Get all events created by an organizer
     */
    function getOrganizerEvents(address organizer) external view returns (uint256[] memory) {
        return _organizerEvents[organizer];
    }
    
    /**
     * @notice Get current event ID counter
     */
    function getCurrentEventId() external view returns (uint256) {
        return _eventIdCounter;
    }
    
    /**
     * @notice Increment entrants count for a pool (called by StakingPool)
     */
    function incrementEntrants(uint256 eventId, PoolClass poolClass) external {
        if (msg.sender != stakingPoolContract) {
            revert UnauthorizedOrganizer();
        }
        _events[eventId].pools[poolClass].entrantsCount++;
    }
    
    /**
     * @notice Increment allocated count for a pool (called by LotteryEngine)
     */
    function incrementAllocated(uint256 eventId, PoolClass poolClass) external {
        if (msg.sender != lotteryEngineContract) {
            revert UnauthorizedOrganizer();
        }
        _events[eventId].pools[poolClass].allocated++;
    }
}
