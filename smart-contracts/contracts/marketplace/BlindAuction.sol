// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBoundTicketNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function lockTicket(uint256 tokenId) external;
    function unlockTicket(uint256 tokenId) external;
    function getTicket(uint256 tokenId) external view returns (
        uint256 tokenId_,
        uint256 eventId,
        uint8 poolClass,
        address originalOwner,
        bytes32 identityCommitment,
        uint64 mintedAt,
        bool redeemed,
        bool locked
    );
}

interface IIdentityVerifier {
    function isIdentityVerified(address user, uint256 eventId) external view returns (bool);
}

/**
 * @title BlindAuction
 * @notice Sealed-bid (commit-reveal) auction for ticket resale
 * @dev Implements two-phase auction: commit phase + reveal phase
 */
contract BlindAuction is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Enums ============
    
    enum AuctionState {
        Active,      // Commit phase active
        Revealing,   // Reveal phase active
        Ended,       // Auction ended, winner determined
        Cancelled    // Auction cancelled
    }
    
    // ============ Structs ============
    
    struct Auction {
        uint256 auctionId;
        uint256 tokenId;
        uint256 eventId;
        address seller;
        uint256 minBid;
        uint256 reservePrice;
        uint64 commitDeadline;
        uint64 revealDeadline;
        AuctionState state;
        address highestBidder;
        uint256 highestBid;
        uint256 totalBids;
        uint256 platformFeePercent;
    }
    
    struct Bid {
        bytes32 commitment;      // H(bidAmount || salt)
        uint256 deposit;         // Deposit (e.g., 10% of claimed bid)
        bool revealed;
        uint256 revealedAmount;
        bytes32 revealedSalt;
    }
    
    // ============ State Variables ============
    
    IERC20 public immutable PYUSD;
    IBoundTicketNFT public ticketNFT;
    IIdentityVerifier public identityVerifier;
    
    uint256 private _auctionIdCounter;
    mapping(uint256 => Auction) public auctions;  // auctionId => Auction
    mapping(uint256 => mapping(address => Bid)) public bids;  // auctionId => bidder => Bid
    mapping(uint256 => address[]) public auctionBidders;  // auctionId => bidders[]
    
    // Platform settings
    uint256 public constant DEFAULT_PLATFORM_FEE = 250;  // 2.5%
    uint256 public constant MIN_DEPOSIT_PERCENT = 1000;  // 10% minimum deposit
    uint256 public constant BASIS_POINTS = 10000;
    
    address public treasury;
    uint256 public collectedFees;
    
    // ============ Events ============
    
    event AuctionCreated(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 minBid,
        uint256 reservePrice,
        uint64 commitDeadline,
        uint64 revealDeadline
    );
    
    event BidCommitted(
        uint256 indexed auctionId,
        address indexed bidder,
        bytes32 commitment,
        uint256 deposit
    );
    
    event BidRevealed(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 winningBid
    );
    
    event AuctionCancelled(uint256 indexed auctionId);
    
    event DepositRefunded(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );
    
    // ============ Errors ============
    
    error NotTicketOwner();
    error TicketAlreadyRedeemed();
    error InvalidAuctionParameters();
    error AuctionNotActive();
    error CommitPhaseEnded();
    error RevealPhaseNotStarted();
    error RevealPhaseEnded();
    error BidAlreadyCommitted();
    error InsufficientDeposit();
    error BidNotCommitted();
    error BidAlreadyRevealed();
    error InvalidReveal();
    error BelowMinBid();
    error AuctionNotEnded();
    error NoWinningBid();
    error Unauthorized();
    error IdentityNotVerified();
    
    // ============ Constructor ============
    
    constructor(address _pyusd, address _treasury) Ownable(msg.sender) {
        require(_pyusd != address(0) && _treasury != address(0), "Invalid address");
        PYUSD = IERC20(_pyusd);
        treasury = _treasury;
    }
    
    // ============ Admin Functions ============
    
    function setTicketNFT(address _ticketNFT) external onlyOwner {
        require(_ticketNFT != address(0), "Invalid address");
        ticketNFT = IBoundTicketNFT(_ticketNFT);
    }
    
    function setIdentityVerifier(address _identityVerifier) external onlyOwner {
        require(_identityVerifier != address(0), "Invalid address");
        identityVerifier = IIdentityVerifier(_identityVerifier);
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }
    
    // ============ Auction Creation ============
    
    /**
     * @notice Create a new blind auction for a ticket
     * @param tokenId Ticket NFT token ID
     * @param minBid Minimum bid amount
     * @param reservePrice Reserve price (hidden)
     * @param commitDuration Duration of commit phase in seconds
     * @param revealDuration Duration of reveal phase in seconds
     */
    function createAuction(
        uint256 tokenId,
        uint256 minBid,
        uint256 reservePrice,
        uint64 commitDuration,
        uint64 revealDuration
    ) external nonReentrant returns (uint256) {
        // Verify ownership
        if (ticketNFT.ownerOf(tokenId) != msg.sender) {
            revert NotTicketOwner();
        }
        
        // Get ticket details
        (,uint256 eventId,,,,,bool redeemed,) = ticketNFT.getTicket(tokenId);
        
        if (redeemed) {
            revert TicketAlreadyRedeemed();
        }
        
        // Validate parameters
        if (minBid == 0 || reservePrice < minBid || commitDuration < 3600 || revealDuration < 1800) {
            revert InvalidAuctionParameters();
        }
        
        // Lock ticket
        ticketNFT.lockTicket(tokenId);
        
        // Create auction
        uint256 auctionId = ++_auctionIdCounter;
        uint64 commitDeadline = uint64(block.timestamp) + commitDuration;
        uint64 revealDeadline = commitDeadline + revealDuration;
        
        auctions[auctionId] = Auction({
            auctionId: auctionId,
            tokenId: tokenId,
            eventId: eventId,
            seller: msg.sender,
            minBid: minBid,
            reservePrice: reservePrice,
            commitDeadline: commitDeadline,
            revealDeadline: revealDeadline,
            state: AuctionState.Active,
            highestBidder: address(0),
            highestBid: 0,
            totalBids: 0,
            platformFeePercent: DEFAULT_PLATFORM_FEE
        });
        
        emit AuctionCreated(
            auctionId,
            tokenId,
            msg.sender,
            minBid,
            reservePrice,
            commitDeadline,
            revealDeadline
        );
        
        return auctionId;
    }
    
    // ============ Bidding Functions ============
    
    /**
     * @notice Commit a sealed bid
     * @param auctionId Auction ID
     * @param commitment Hash of (bidAmount || salt)
     */
    function commitBid(uint256 auctionId, bytes32 commitment) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        // Verify auction state
        if (auction.state != AuctionState.Active) {
            revert AuctionNotActive();
        }
        if (block.timestamp >= auction.commitDeadline) {
            revert CommitPhaseEnded();
        }
        
        // Check if already committed
        if (bids[auctionId][msg.sender].commitment != bytes32(0)) {
            revert BidAlreadyCommitted();
        }
        
        // Verify identity (bidder must have verified identity for this event)
        if (!identityVerifier.isIdentityVerified(msg.sender, auction.eventId)) {
            revert IdentityNotVerified();
        }
        
        // Require minimum deposit (we accept PYUSD or ETH for deposit)
        uint256 minDeposit = (auction.minBid * MIN_DEPOSIT_PERCENT) / BASIS_POINTS;
        
        // For simplicity, use msg.value as deposit
        if (msg.value < minDeposit) {
            revert InsufficientDeposit();
        }
        
        // Store bid commitment
        bids[auctionId][msg.sender] = Bid({
            commitment: commitment,
            deposit: msg.value,
            revealed: false,
            revealedAmount: 0,
            revealedSalt: bytes32(0)
        });
        
        auctionBidders[auctionId].push(msg.sender);
        auction.totalBids++;
        
        emit BidCommitted(auctionId, msg.sender, commitment, msg.value);
    }
    
    /**
     * @notice Reveal a committed bid
     * @param auctionId Auction ID
     * @param bidAmount Actual bid amount
     * @param salt Random salt used in commitment
     */
    function revealBid(
        uint256 auctionId,
        uint256 bidAmount,
        bytes32 salt
    ) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        // Verify timing
        if (block.timestamp < auction.commitDeadline) {
            revert RevealPhaseNotStarted();
        }
        if (block.timestamp >= auction.revealDeadline) {
            revert RevealPhaseEnded();
        }
        
        // Update state if needed
        if (auction.state == AuctionState.Active) {
            auction.state = AuctionState.Revealing;
        }
        
        Bid storage bid = bids[auctionId][msg.sender];
        
        // Verify bid exists
        if (bid.commitment == bytes32(0)) {
            revert BidNotCommitted();
        }
        if (bid.revealed) {
            revert BidAlreadyRevealed();
        }
        
        // Verify reveal matches commitment
        bytes32 computedCommitment = keccak256(abi.encodePacked(bidAmount, salt));
        if (computedCommitment != bid.commitment) {
            revert InvalidReveal();
        }
        
        // Check minimum bid
        if (bidAmount < auction.minBid) {
            revert BelowMinBid();
        }
        
        // Mark as revealed
        bid.revealed = true;
        bid.revealedAmount = bidAmount;
        bid.revealedSalt = salt;
        
        // Update highest bid if applicable
        if (bidAmount > auction.highestBid && bidAmount >= auction.reservePrice) {
            auction.highestBid = bidAmount;
            auction.highestBidder = msg.sender;
        }
        
        emit BidRevealed(auctionId, msg.sender, bidAmount);
    }
    
    /**
     * @notice End auction and transfer ticket to winner
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        // Verify timing
        if (block.timestamp < auction.revealDeadline) {
            revert AuctionNotEnded();
        }
        
        // Verify state
        if (auction.state != AuctionState.Active && auction.state != AuctionState.Revealing) {
            revert AuctionNotEnded();
        }
        
        auction.state = AuctionState.Ended;
        
        // Check if there's a winning bid
        if (auction.highestBidder == address(0) || auction.highestBid < auction.reservePrice) {
            // No winner, unlock ticket and refund all deposits
            ticketNFT.unlockTicket(auction.tokenId);
            _refundAllDeposits(auctionId);
            emit AuctionCancelled(auctionId);
            return;
        }
        
        // Process winning bid
        address winner = auction.highestBidder;
        uint256 winningBid = auction.highestBid;
        
        // Calculate platform fee
        uint256 platformFee = (winningBid * auction.platformFeePercent) / BASIS_POINTS;
        uint256 sellerProceeds = winningBid - platformFee;
        
        // Transfer PYUSD from winner to contract
        PYUSD.safeTransferFrom(winner, address(this), winningBid);
        
        // Transfer proceeds to seller
        PYUSD.safeTransfer(auction.seller, sellerProceeds);
        
        // Collect platform fee
        collectedFees += platformFee;
        PYUSD.safeTransfer(treasury, platformFee);
        
        // Transfer ticket to winner
        ticketNFT.unlockTicket(auction.tokenId);
        ticketNFT.transferFrom(auction.seller, winner, auction.tokenId);
        
        // Refund deposits to non-winners
        _refundNonWinnerDeposits(auctionId, winner);
        
        emit AuctionEnded(auctionId, winner, winningBid);
    }
    
    /**
     * @notice Cancel auction (only by seller before reveal phase)
     */
    function cancelAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        if (msg.sender != auction.seller) {
            revert Unauthorized();
        }
        
        if (auction.state != AuctionState.Active) {
            revert AuctionNotActive();
        }
        
        if (block.timestamp >= auction.commitDeadline) {
            revert CommitPhaseEnded();
        }
        
        auction.state = AuctionState.Cancelled;
        
        // Unlock ticket
        ticketNFT.unlockTicket(auction.tokenId);
        
        // Refund all deposits
        _refundAllDeposits(auctionId);
        
        emit AuctionCancelled(auctionId);
    }
    
    // ============ Internal Functions ============
    
    function _refundAllDeposits(uint256 auctionId) internal {
        address[] memory bidders = auctionBidders[auctionId];
        
        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            Bid storage bid = bids[auctionId][bidder];
            
            if (bid.deposit > 0) {
                uint256 refundAmount = bid.deposit;
                bid.deposit = 0;
                payable(bidder).transfer(refundAmount);
                emit DepositRefunded(auctionId, bidder, refundAmount);
            }
        }
    }
    
    function _refundNonWinnerDeposits(uint256 auctionId, address winner) internal {
        address[] memory bidders = auctionBidders[auctionId];
        
        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            
            if (bidder == winner) {
                continue;  // Winner's deposit stays
            }
            
            Bid storage bid = bids[auctionId][bidder];
            
            if (bid.deposit > 0) {
                uint256 refundAmount = bid.deposit;
                bid.deposit = 0;
                payable(bidder).transfer(refundAmount);
                emit DepositRefunded(auctionId, bidder, refundAmount);
            }
        }
    }
    
    // ============ View Functions ============
    
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }
    
    function getBid(uint256 auctionId, address bidder) external view returns (Bid memory) {
        return bids[auctionId][bidder];
    }
    
    function getAuctionBidders(uint256 auctionId) external view returns (address[] memory) {
        return auctionBidders[auctionId];
    }
    
    function isAuctionActive(uint256 auctionId) external view returns (bool) {
        return auctions[auctionId].state == AuctionState.Active && 
               block.timestamp < auctions[auctionId].commitDeadline;
    }
    
    function isRevealPhase(uint256 auctionId) external view returns (bool) {
        Auction memory auction = auctions[auctionId];
        return block.timestamp >= auction.commitDeadline && 
               block.timestamp < auction.revealDeadline;
    }
    
    function canEndAuction(uint256 auctionId) external view returns (bool) {
        return block.timestamp >= auctions[auctionId].revealDeadline;
    }
    
    // ============ Utility ============
    
    receive() external payable {}
    
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
