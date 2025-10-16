// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
}

interface IIdentityVerifier {
    function isIdentityVerified(address user, uint256 eventId) external view returns (bool);
    function getIdentityCommitment(address user, uint256 eventId) external view returns (bytes32);
    function verifyTransferIdentity(address from, address to, uint256 eventId, bytes calldata proof) external view returns (bool);
}

interface IStakingPool {
    function isWinner(uint256 eventId, address user) external view returns (bool);
}

/**
 * @title BoundTicketNFT
 * @notice Soulbound/Identity-bound NFT tickets for events
 * @dev Implements ERC-721 with strict transfer restrictions
 */
contract BoundTicketNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    
    // ============ Enums ============
    
    enum TransferMode {
        Soulbound,          // No transfers allowed
        IdentityBound,      // Transfers only with identity proof
        Unrestricted        // Normal ERC-721 (for testing)
    }
    
    // ============ Structs ============
    
    struct Ticket {
        uint256 tokenId;
        uint256 eventId;
        IEventManager.PoolClass poolClass;
        address originalOwner;
        bytes32 identityCommitment;
        uint64 mintedAt;
        bool redeemed;
        bool locked;  // Locked when listed for auction
    }
    
    // ============ State Variables ============
    
    IEventManager public eventManager;
    IIdentityVerifier public identityVerifier;
    IStakingPool public stakingPool;
    
    TransferMode public transferMode;
    
    uint256 private _tokenIdCounter;
    mapping(uint256 => Ticket) public tickets;  // tokenId => Ticket
    mapping(uint256 => mapping(address => uint256)) public userEventTicket;  // eventId => user => tokenId
    mapping(uint256 => uint256[]) public eventTickets;  // eventId => tokenIds[]
    
    // Auction contract (can lock/unlock tickets)
    address public auctionContract;
    
    // Metadata
    string private _baseTokenURI;
    mapping(uint256 => string) private _encryptedMetadata;  // tokenId => encrypted IPFS hash
    
    // ============ Events ============
    
    event TicketMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 indexed eventId,
        IEventManager.PoolClass poolClass
    );
    
    event TicketRedeemed(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 indexed eventId
    );
    
    event TicketLocked(uint256 indexed tokenId);
    event TicketUnlocked(uint256 indexed tokenId);

    event TransferModeChanged(TransferMode oldMode, TransferMode newMode);

    // ============ Errors ============

    error TransferNotAllowed();
    error TicketIsLocked();
    error NotTicketOwner();
    error AlreadyRedeemed();
    error IdentityVerificationFailed();
    error NotWinner();
    error TicketAlreadyMinted();
    error InvalidEventState();
    error Unauthorized();
    
    // ============ Modifiers ============
    
    modifier onlyAuction() {
        if (msg.sender != auctionContract) revert Unauthorized();
        _;
    }
    
    // ============ Constructor ============
    
    constructor() ERC721("FairStake Ticket", "FSTKT") Ownable(msg.sender) {
        transferMode = TransferMode.IdentityBound;  // Default mode
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
    
    function setStakingPool(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "Invalid address");
        stakingPool = IStakingPool(_stakingPool);
    }
    
    function setAuctionContract(address _auctionContract) external onlyOwner {
        require(_auctionContract != address(0), "Invalid address");
        auctionContract = _auctionContract;
    }
    
    function setTransferMode(TransferMode _mode) external onlyOwner {
        TransferMode oldMode = transferMode;
        transferMode = _mode;
        emit TransferModeChanged(oldMode, _mode);
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    // ============ Minting Functions ============
    
    /**
     * @notice Mint ticket to winner
     * @param winner Winner address
     * @param eventId Event ID
     * @param poolClass Pool class
     * @param encryptedMetadataURI Encrypted IPFS URI for ticket metadata
     */
    function mintTicket(
        address winner,
        uint256 eventId,
        IEventManager.PoolClass poolClass,
        string calldata encryptedMetadataURI
    ) external nonReentrant returns (uint256) {
        // Verify event state
        (,,,,,, IEventManager.EventState state,,,,) = eventManager.getEvent(eventId);
        if (state != IEventManager.EventState.Allocated && state != IEventManager.EventState.Completed) {
            revert InvalidEventState();
        }
        
        // Verify winner status
        if (!stakingPool.isWinner(eventId, winner)) {
            revert NotWinner();
        }
        
        // Check if already minted
        if (userEventTicket[eventId][winner] != 0) {
            revert TicketAlreadyMinted();
        }
        
        // Verify identity
        if (!identityVerifier.isIdentityVerified(winner, eventId)) {
            revert IdentityVerificationFailed();
        }
        
        // Get identity commitment
        bytes32 identityCommitment = identityVerifier.getIdentityCommitment(winner, eventId);
        
        // Mint NFT
        uint256 tokenId = ++_tokenIdCounter;
        _safeMint(winner, tokenId);
        _setTokenURI(tokenId, encryptedMetadataURI);
        
        // Store ticket data
        tickets[tokenId] = Ticket({
            tokenId: tokenId,
            eventId: eventId,
            poolClass: poolClass,
            originalOwner: winner,
            identityCommitment: identityCommitment,
            mintedAt: uint64(block.timestamp),
            redeemed: false,
            locked: false
        });
        
        userEventTicket[eventId][winner] = tokenId;
        eventTickets[eventId].push(tokenId);
        _encryptedMetadata[tokenId] = encryptedMetadataURI;
        
        emit TicketMinted(tokenId, winner, eventId, poolClass);
        
        return tokenId;
    }
    
    /**
     * @notice Batch mint tickets to multiple winners
     */
    function batchMintTickets(
        address[] calldata winners,
        uint256 eventId,
        IEventManager.PoolClass poolClass,
        string calldata encryptedMetadataURI
    ) external nonReentrant returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](winners.length);
        
        for (uint256 i = 0; i < winners.length; i++) {
            tokenIds[i] = this.mintTicket(winners[i], eventId, poolClass, encryptedMetadataURI);
        }
        
        return tokenIds;
    }
    
    // ============ Ticket Functions ============
    
    /**
     * @notice Redeem ticket (mark as used)
     * @param tokenId Token ID
     */
    function redeemTicket(uint256 tokenId) external nonReentrant {
        if (ownerOf(tokenId) != msg.sender) {
            revert NotTicketOwner();
        }
        
        Ticket storage ticket = tickets[tokenId];
        
        if (ticket.redeemed) {
            revert AlreadyRedeemed();
        }
        
        ticket.redeemed = true;
        
        emit TicketRedeemed(tokenId, msg.sender, ticket.eventId);
    }
    
    /**
     * @notice Lock ticket (for auction listing)
     */
    function lockTicket(uint256 tokenId) external onlyAuction {
        tickets[tokenId].locked = true;
        emit TicketLocked(tokenId);
    }
    
    /**
     * @notice Unlock ticket
     */
    function unlockTicket(uint256 tokenId) external onlyAuction {
        tickets[tokenId].locked = false;
        emit TicketUnlocked(tokenId);
    }
    
    // ============ Transfer Override ============
    
    /**
     * @notice Override transfer to enforce identity binding
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        virtual 
        override 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Check if ticket is locked
        if (tickets[tokenId].locked) {
            revert TicketIsLocked();
        }
        
        // Enforce transfer mode
        if (transferMode == TransferMode.Soulbound) {
            // No transfers allowed except burning
            if (to != address(0)) {
                revert TransferNotAllowed();
            }
        } else if (transferMode == TransferMode.IdentityBound) {
            // Transfer only if 'to' has verified identity for the same event
            uint256 eventId = tickets[tokenId].eventId;
            
            if (to != address(0) && !identityVerifier.isIdentityVerified(to, eventId)) {
                revert IdentityVerificationFailed();
            }
        }
        // TransferMode.Unrestricted allows normal transfers
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @notice Override approve to prevent approvals in soulbound mode
     */
    function approve(address to, uint256 tokenId) 
        public 
        virtual 
        override(ERC721, IERC721) 
    {
        if (transferMode == TransferMode.Soulbound && to != address(0)) {
            revert TransferNotAllowed();
        }
        super.approve(to, tokenId);
    }
    
    /**
     * @notice Override setApprovalForAll to prevent in soulbound mode
     */
    function setApprovalForAll(address operator, bool approved) 
        public 
        virtual 
        override(ERC721, IERC721) 
    {
        if (transferMode == TransferMode.Soulbound && approved) {
            revert TransferNotAllowed();
        }
        super.setApprovalForAll(operator, approved);
    }
    
    // ============ View Functions ============
    
    function getTicket(uint256 tokenId) external view returns (Ticket memory) {
        return tickets[tokenId];
    }
    
    function getUserTicket(uint256 eventId, address user) external view returns (uint256) {
        return userEventTicket[eventId][user];
    }
    
    function getEventTickets(uint256 eventId) external view returns (uint256[] memory) {
        return eventTickets[eventId];
    }
    
    function getEncryptedMetadata(uint256 tokenId) external view returns (string memory) {
        return _encryptedMetadata[tokenId];
    }
    
    function isTicketValid(uint256 tokenId) external view returns (bool) {
        return !tickets[tokenId].redeemed && !tickets[tokenId].locked;
    }
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
