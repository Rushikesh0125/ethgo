// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Pyth Entropy interface for VRF
interface IEntropy {
    function request(
        address provider,
        bytes32 userCommitment,
        bool useBlockHash
    ) external payable returns (uint64 sequenceNumber);
    
    function reveal(
        address provider,
        uint64 sequenceNumber,
        bytes32 userRandomNumber
    ) external returns (bytes32 randomNumber);
    
    function getFee(address provider) external view returns (uint128);
}

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
    function markAllocated(uint256 eventId, bytes32 vrfRequestId) external;
    function incrementAllocated(uint256 eventId, PoolClass poolClass) external;
}

interface IStakingPool {
    struct Stake {
        address user;
        uint256 eventId;
        IEventManager.PoolClass poolClass;
        uint256 stakeAmount;
        uint256 facePrice;
        uint256 platformFee;
        bytes32 identityCommitment;
        uint64 stakedAt;
        bool isWinner;
        bool claimed;
        bool refunded;
    }
    
    function getEventPoolStakes(uint256 eventId, IEventManager.PoolClass poolClass) external view returns (uint256[] memory);
    function getStake(uint256 stakeId) external view returns (Stake memory);
    function setWinners(uint256 eventId, IEventManager.PoolClass poolClass, address[] calldata winners) external;
    function fundRebatePool(uint256 eventId, IEventManager.PoolClass poolClass) external;
}

/**
 * @title LotteryEngine
 * @notice Manages lottery draws using Pyth Entropy for verifiable randomness
 * @dev Implements deterministic winner selection based on VRF output
 */
contract LotteryEngine is Ownable, ReentrancyGuard {
    
    // ============ State Variables ============
    
    IEntropy public immutable entropy;
    address public immutable entropyProvider;
    IEventManager public eventManager;
    IStakingPool public stakingPool;
    
    // VRF tracking
    struct DrawRequest {
        uint256 eventId;
        IEventManager.PoolClass poolClass;
        uint64 sequenceNumber;
        bytes32 userRandomNumber;
        bytes32 providerRandomNumber;
        bool revealed;
        uint64 requestedAt;
    }
    
    mapping(uint256 => mapping(IEventManager.PoolClass => DrawRequest)) public drawRequests;  // eventId => poolClass => DrawRequest
    mapping(uint64 => uint256) public sequenceToEvent;  // sequenceNumber => eventId
    mapping(uint64 => IEventManager.PoolClass) public sequenceToPool;  // sequenceNumber => poolClass
    
    // Draw results
    mapping(uint256 => mapping(IEventManager.PoolClass => address[])) public selectedWinners;
    mapping(uint256 => mapping(IEventManager.PoolClass => bool)) public drawCompleted;
    
    // ============ Events ============
    
    event DrawRequested(
        uint256 indexed eventId,
        IEventManager.PoolClass indexed poolClass,
        uint64 sequenceNumber,
        bytes32 userCommitment
    );
    
    event DrawRevealed(
        uint256 indexed eventId,
        IEventManager.PoolClass indexed poolClass,
        bytes32 randomNumber
    );
    
    event WinnersSelected(
        uint256 indexed eventId,
        IEventManager.PoolClass indexed poolClass,
        address[] winners,
        uint256 selectedCount
    );
    
    // ============ Errors ============
    
    error InvalidState();
    error DrawAlreadyRequested();
    error DrawNotRequested();
    error DrawAlreadyRevealed();
    error InsufficientFee();
    error Unauthorized();
    error NoParticipants();
    error InvalidPoolClass();
    
    // ============ Constructor ============
    
    constructor(address _entropy, address _entropyProvider) Ownable(msg.sender) {
        require(_entropy != address(0) && _entropyProvider != address(0), "Invalid address");
        entropy = IEntropy(_entropy);
        entropyProvider = _entropyProvider;
    }
    
    // ============ Admin Functions ============
    
    function setEventManager(address _eventManager) external onlyOwner {
        require(_eventManager != address(0), "Invalid address");
        eventManager = IEventManager(_eventManager);
    }
    
    function setStakingPool(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "Invalid address");
        stakingPool = IStakingPool(_stakingPool);
    }
    
    // ============ Draw Functions ============
    
    /**
     * @notice Request random number for lottery draw
     * @param eventId The event ID
     * @param poolClass The pool class to draw
     */
    function requestDraw(
        uint256 eventId,
        IEventManager.PoolClass poolClass
    ) external payable nonReentrant returns (uint64) {
        // Verify event state
        (,,,,,, IEventManager.EventState state,,,,) = eventManager.getEvent(eventId);
        if (state != IEventManager.EventState.Drawing) {
            revert InvalidState();
        }
        
        // Check if draw already requested
        if (drawRequests[eventId][poolClass].sequenceNumber != 0) {
            revert DrawAlreadyRequested();
        }
        
        // Verify pool has participants
        uint256[] memory stakeIds = stakingPool.getEventPoolStakes(eventId, poolClass);
        if (stakeIds.length == 0) {
            revert NoParticipants();
        }
        
        // Check entropy fee
        uint128 fee = entropy.getFee(entropyProvider);
        if (msg.value < fee) {
            revert InsufficientFee();
        }
        
        // Generate user commitment (secret random number)
        bytes32 userRandomNumber = keccak256(abi.encodePacked(
            eventId,
            poolClass,
            block.timestamp,
            block.prevrandao,
            msg.sender
        ));
        
        bytes32 userCommitment = keccak256(abi.encodePacked(userRandomNumber));
        
        // Request entropy
        uint64 sequenceNumber = entropy.request{value: fee}(
            entropyProvider,
            userCommitment,
            true  // use block hash
        );
        
        // Store request
        drawRequests[eventId][poolClass] = DrawRequest({
            eventId: eventId,
            poolClass: poolClass,
            sequenceNumber: sequenceNumber,
            userRandomNumber: userRandomNumber,
            providerRandomNumber: bytes32(0),
            revealed: false,
            requestedAt: uint64(block.timestamp)
        });
        
        sequenceToEvent[sequenceNumber] = eventId;
        sequenceToPool[sequenceNumber] = poolClass;
        
        // Refund excess
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        emit DrawRequested(eventId, poolClass, sequenceNumber, userCommitment);
        
        return sequenceNumber;
    }
    
    /**
     * @notice Reveal random number and select winners
     * @param eventId The event ID
     * @param poolClass The pool class
     */
    function revealAndSelectWinners(
        uint256 eventId,
        IEventManager.PoolClass poolClass
    ) external nonReentrant {
        DrawRequest storage request = drawRequests[eventId][poolClass];
        
        if (request.sequenceNumber == 0) {
            revert DrawNotRequested();
        }
        if (request.revealed) {
            revert DrawAlreadyRevealed();
        }
        
        // Reveal entropy
        bytes32 randomNumber = entropy.reveal(
            entropyProvider,
            request.sequenceNumber,
            request.userRandomNumber
        );
        
        request.providerRandomNumber = randomNumber;
        request.revealed = true;
        
        emit DrawRevealed(eventId, poolClass, randomNumber);
        
        // Select winners
        _selectWinners(eventId, poolClass, randomNumber);
    }
    
    /**
     * @notice Internal function to select winners deterministically
     */
    function _selectWinners(
        uint256 eventId,
        IEventManager.PoolClass poolClass,
        bytes32 randomSeed
    ) internal {
        // Get pool details
        (, uint256 quantity,,,) = eventManager.getPool(eventId, poolClass);
        
        // Get all participants
        uint256[] memory stakeIds = stakingPool.getEventPoolStakes(eventId, poolClass);
        uint256 participantCount = stakeIds.length;
        
        if (participantCount == 0) {
            revert NoParticipants();
        }
        
        // Get participant addresses and identity commitments
        address[] memory participants = new address[](participantCount);
        bytes32[] memory commitments = new bytes32[](participantCount);
        
        for (uint256 i = 0; i < participantCount; i++) {
            IStakingPool.Stake memory stake = stakingPool.getStake(stakeIds[i]);
            participants[i] = stake.user;
            commitments[i] = stake.identityCommitment;
        }
        
        // Deterministic shuffle using Fisher-Yates with VRF seed
        address[] memory shuffled = new address[](participantCount);
        for (uint256 i = 0; i < participantCount; i++) {
            shuffled[i] = participants[i];
        }
        
        for (uint256 i = participantCount - 1; i > 0; i--) {
            // Generate deterministic random index
            uint256 j = uint256(keccak256(abi.encodePacked(randomSeed, i))) % (i + 1);
            
            // Swap
            address temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        
        // Select first N winners
        uint256 winnersCount = quantity > participantCount ? participantCount : quantity;
        address[] memory winners = new address[](winnersCount);
        
        for (uint256 i = 0; i < winnersCount; i++) {
            winners[i] = shuffled[i];
        }
        
        // Store winners
        selectedWinners[eventId][poolClass] = winners;
        drawCompleted[eventId][poolClass] = true;
        
        // Set winners in StakingPool
        stakingPool.setWinners(eventId, poolClass, winners);
        
        // Update allocation count in EventManager
        for (uint256 i = 0; i < winnersCount; i++) {
            eventManager.incrementAllocated(eventId, poolClass);
        }
        
        emit WinnersSelected(eventId, poolClass, winners, winnersCount);
    }
    
    /**
     * @notice Complete draw for all pools and mark event as allocated
     */
    function completeEventDraw(uint256 eventId) external {
        // Check all enabled pools are drawn
        bool allComplete = true;
        
        if (eventManager.isPoolEnabled(eventId, IEventManager.PoolClass.A)) {
            if (!drawCompleted[eventId][IEventManager.PoolClass.A]) {
                allComplete = false;
            }
        }
        
        if (eventManager.isPoolEnabled(eventId, IEventManager.PoolClass.B)) {
            if (!drawCompleted[eventId][IEventManager.PoolClass.B]) {
                allComplete = false;
            }
        }
        
        if (eventManager.isPoolEnabled(eventId, IEventManager.PoolClass.C)) {
            if (!drawCompleted[eventId][IEventManager.PoolClass.C]) {
                allComplete = false;
            }
        }
        
        if (!allComplete) {
            revert InvalidState();
        }
        
        // Mark event as allocated
        bytes32 vrfRequestId = keccak256(abi.encodePacked(
            drawRequests[eventId][IEventManager.PoolClass.A].providerRandomNumber,
            drawRequests[eventId][IEventManager.PoolClass.B].providerRandomNumber,
            drawRequests[eventId][IEventManager.PoolClass.C].providerRandomNumber
        ));
        
        eventManager.markAllocated(eventId, vrfRequestId);
        
        // Fund rebate pools
        if (eventManager.isPoolEnabled(eventId, IEventManager.PoolClass.A)) {
            stakingPool.fundRebatePool(eventId, IEventManager.PoolClass.A);
        }
        if (eventManager.isPoolEnabled(eventId, IEventManager.PoolClass.B)) {
            stakingPool.fundRebatePool(eventId, IEventManager.PoolClass.B);
        }
        if (eventManager.isPoolEnabled(eventId, IEventManager.PoolClass.C)) {
            stakingPool.fundRebatePool(eventId, IEventManager.PoolClass.C);
        }
    }
    
    // ============ View Functions ============
    
    function getDrawRequest(uint256 eventId, IEventManager.PoolClass poolClass) 
        external 
        view 
        returns (DrawRequest memory) 
    {
        return drawRequests[eventId][poolClass];
    }
    
    function getWinners(uint256 eventId, IEventManager.PoolClass poolClass) 
        external 
        view 
        returns (address[] memory) 
    {
        return selectedWinners[eventId][poolClass];
    }
    
    function isDrawComplete(uint256 eventId, IEventManager.PoolClass poolClass) 
        external 
        view 
        returns (bool) 
    {
        return drawCompleted[eventId][poolClass];
    }
    
    /**
     * @notice Get entropy fee for draw
     */
    function getDrawFee() external view returns (uint128) {
        return entropy.getFee(entropyProvider);
    }
    
    // ============ Utility Functions ============
    
    receive() external payable {}
    
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
