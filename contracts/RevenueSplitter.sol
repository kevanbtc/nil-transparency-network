// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RevenueSplitter
 * @notice Deterministic payout contract for athlete/agent/school/brand/tax wallets
 * @dev Supports time-locks, cliffs, and revenue-share schedules for NIL deals
 */
contract RevenueSplitter is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // Events
    event SplitConfigured(
        bytes32 indexed splitId,
        address[] beneficiaries,
        uint256[] shares,
        uint256 lockDuration,
        uint256 cliffDuration
    );

    event PaymentSplit(
        bytes32 indexed splitId,
        address indexed payer,
        uint256 totalAmount,
        address[] beneficiaries,
        uint256[] amounts
    );

    event FundsReleased(
        bytes32 indexed splitId,
        address indexed beneficiary,
        uint256 amount,
        address token
    );

    event TimeVestingUpdated(
        bytes32 indexed splitId,
        uint256 releaseTime,
        bool isActive
    );

    // Structs
    struct SplitConfig {
        address[] beneficiaries;     // [athlete, agent, school, brand, tax_authority]
        uint256[] shares;           // Shares in basis points (10000 = 100%)
        uint256 lockDuration;       // Duration before funds can be released
        uint256 cliffDuration;      // Cliff period before any release
        uint256 startTime;          // When the split was created
        bool isActive;              // Whether the split is currently active
        mapping(address => uint256) accumulatedFunds;  // Funds per beneficiary
        mapping(address => uint256) releasedFunds;     // Already released funds
    }

    struct VestingSchedule {
        uint256 totalAmount;        // Total amount to vest
        uint256 releasedAmount;     // Amount already released
        uint256 startTime;          // Vesting start time
        uint256 duration;           // Total vesting duration
        uint256 cliffDuration;      // Cliff duration
    }

    // State variables
    mapping(bytes32 => SplitConfig) public splits;
    mapping(bytes32 => mapping(address => VestingSchedule)) public vestingSchedules;
    mapping(address => bool) public supportedTokens;
    
    address public complianceRegistry;
    
    // Revenue split categories for standard NIL deals
    enum SplitCategory {
        ATHLETE,        // 0: Athlete's share
        AGENT,          // 1: Agent/representative fee
        SCHOOL,         // 2: School revenue share
        COLLECTIVE,     // 3: Collective/booster share
        PLATFORM,       // 4: Platform fee
        TAX_ESCROW      // 5: Tax withholding
    }

    // Standard split configurations by deal type
    mapping(string => uint256[]) public standardSplits;

    constructor(address _complianceRegistry) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        complianceRegistry = _complianceRegistry;
        
        // Initialize supported tokens (native ETH is always supported)
        supportedTokens[address(0)] = true; // Native ETH
        
        // Set standard split configurations
        _initializeStandardSplits();
    }

    /**
     * @notice Configure a new revenue split
     * @param splitId Unique identifier for this split
     * @param beneficiaries Array of beneficiary addresses
     * @param shares Array of shares in basis points (total should be <= 10000)
     * @param lockDuration Time before funds can be released (in seconds)
     * @param cliffDuration Cliff period before any vesting begins
     */
    function configureSplit(
        bytes32 splitId,
        address[] calldata beneficiaries,
        uint256[] calldata shares,
        uint256 lockDuration,
        uint256 cliffDuration
    ) external onlyRole(ADMIN_ROLE) {
        require(beneficiaries.length > 0, "No beneficiaries provided");
        require(beneficiaries.length == shares.length, "Array length mismatch");
        require(_validateShares(shares), "Invalid shares configuration");
        require(splits[splitId].beneficiaries.length == 0, "Split already exists");

        SplitConfig storage split = splits[splitId];
        split.beneficiaries = beneficiaries;
        split.shares = shares;
        split.lockDuration = lockDuration;
        split.cliffDuration = cliffDuration;
        split.startTime = block.timestamp;
        split.isActive = true;

        emit SplitConfigured(splitId, beneficiaries, shares, lockDuration, cliffDuration);
    }

    /**
     * @notice Create a standard NIL deal split
     * @param dealId Deal identifier
     * @param dealType Type of deal ("endorsement", "social", "appearance", etc.)
     * @param athlete Athlete's address
     * @param agent Agent's address (can be zero address)
     * @param school School's address
     * @param collective Collective/booster address (can be zero address)
     * @param platform Platform address
     */
    function createStandardNILSplit(
        bytes32 dealId,
        string memory dealType,
        address athlete,
        address agent,
        address school,
        address collective,
        address platform
    ) external onlyRole(ADMIN_ROLE) returns (bytes32 splitId) {
        require(athlete != address(0), "Invalid athlete address");
        require(school != address(0), "Invalid school address");
        require(platform != address(0), "Invalid platform address");
        
        uint256[] memory splitShares = standardSplits[dealType];
        require(splitShares.length > 0, "Unknown deal type");

        // Build beneficiary array (filter out zero addresses)
        address[] memory beneficiaries = new address[](6);
        uint256[] memory shares = new uint256[](6);
        uint256 count = 0;

        // Always include athlete, school, platform
        beneficiaries[count] = athlete;
        shares[count] = splitShares[uint256(SplitCategory.ATHLETE)];
        count++;

        beneficiaries[count] = school;
        shares[count] = splitShares[uint256(SplitCategory.SCHOOL)];
        count++;

        beneficiaries[count] = platform;
        shares[count] = splitShares[uint256(SplitCategory.PLATFORM)];
        count++;

        // Optional: Agent
        if (agent != address(0)) {
            beneficiaries[count] = agent;
            shares[count] = splitShares[uint256(SplitCategory.AGENT)];
            count++;
        }

        // Optional: Collective
        if (collective != address(0)) {
            beneficiaries[count] = collective;
            shares[count] = splitShares[uint256(SplitCategory.COLLECTIVE)];
            count++;
        }

        // Tax escrow address (could be a treasury contract)
        if (splitShares[uint256(SplitCategory.TAX_ESCROW)] > 0) {
            beneficiaries[count] = address(this); // Self-custody tax escrow for now
            shares[count] = splitShares[uint256(SplitCategory.TAX_ESCROW)];
            count++;
        }

        // Resize arrays to actual count
        assembly {
            mstore(beneficiaries, count)
            mstore(shares, count)
        }

        splitId = keccak256(abi.encodePacked(dealId, block.timestamp));
        
        // Configure with standard 30-day lock and 7-day cliff for NIL deals
        configureSplit(splitId, beneficiaries, shares, 30 days, 7 days);
        
        return splitId;
    }

    /**
     * @notice Split incoming payment according to configuration
     * @param splitId The split configuration to use
     */
    function splitPayment(bytes32 splitId) external payable nonReentrant {
        require(msg.value > 0, "No payment provided");
        _processSplit(splitId, address(0), msg.value);
    }

    /**
     * @notice Split ERC20 token payment
     * @param splitId The split configuration to use
     * @param token ERC20 token address
     * @param amount Amount to split
     */
    function splitTokenPayment(
        bytes32 splitId,
        address token,
        uint256 amount
    ) external nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Invalid amount");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _processSplit(splitId, token, amount);
    }

    /**
     * @notice Release vested funds for a beneficiary
     * @param splitId Split identifier
     * @param beneficiary Address to release funds to
     * @param token Token address (address(0) for ETH)
     */
    function releaseFunds(
        bytes32 splitId,
        address beneficiary,
        address token
    ) external nonReentrant {
        require(splits[splitId].isActive, "Split not active");
        
        uint256 releasableAmount = _getReleasableAmount(splitId, beneficiary, token);
        require(releasableAmount > 0, "No funds to release");

        VestingSchedule storage vesting = vestingSchedules[splitId][beneficiary];
        vesting.releasedAmount += releasableAmount;

        if (token == address(0)) {
            payable(beneficiary).transfer(releasableAmount);
        } else {
            IERC20(token).safeTransfer(beneficiary, releasableAmount);
        }

        emit FundsReleased(splitId, beneficiary, releasableAmount, token);
    }

    /**
     * @notice Get releasable amount for a beneficiary
     * @param splitId Split identifier
     * @param beneficiary Beneficiary address
     * @param token Token address
     */
    function getReleasableAmount(
        bytes32 splitId,
        address beneficiary,
        address token
    ) external view returns (uint256) {
        return _getReleasableAmount(splitId, beneficiary, token);
    }

    /**
     * @notice Add supported token
     * @param token Token address to add
     */
    function addSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        supportedTokens[token] = true;
    }

    /**
     * @notice Remove supported token
     * @param token Token address to remove
     */
    function removeSupportedToken(address token) external onlyRole(ADMIN_ROLE) {
        supportedTokens[token] = false;
    }

    /**
     * @notice Update standard split configuration for a deal type
     * @param dealType Type of deal
     * @param newSplits Array of split percentages in basis points
     */
    function updateStandardSplit(
        string memory dealType,
        uint256[] calldata newSplits
    ) external onlyRole(ADMIN_ROLE) {
        require(newSplits.length == 6, "Must provide 6 split percentages");
        require(_validateShares(newSplits), "Invalid shares configuration");
        
        standardSplits[dealType] = newSplits;
    }

    // Internal functions
    function _processSplit(bytes32 splitId, address token, uint256 amount) internal {
        SplitConfig storage split = splits[splitId];
        require(split.isActive, "Split not active");

        address[] memory beneficiaries = split.beneficiaries;
        uint256[] memory shares = split.shares;
        uint256[] memory amounts = new uint256[](beneficiaries.length);

        // Calculate individual amounts
        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            amounts[i] = (amount * shares[i]) / 10000;
            split.accumulatedFunds[beneficiaries[i]] += amounts[i];
            totalDistributed += amounts[i];
            
            // Initialize vesting schedule if it doesn't exist
            if (vestingSchedules[splitId][beneficiaries[i]].startTime == 0) {
                vestingSchedules[splitId][beneficiaries[i]] = VestingSchedule({
                    totalAmount: amounts[i],
                    releasedAmount: 0,
                    startTime: block.timestamp,
                    duration: split.lockDuration,
                    cliffDuration: split.cliffDuration
                });
            } else {
                vestingSchedules[splitId][beneficiaries[i]].totalAmount += amounts[i];
            }
        }

        // Handle any rounding dust by adding to the first beneficiary
        if (totalDistributed < amount) {
            uint256 dust = amount - totalDistributed;
            split.accumulatedFunds[beneficiaries[0]] += dust;
            amounts[0] += dust;
        }

        emit PaymentSplit(splitId, msg.sender, amount, beneficiaries, amounts);
    }

    function _getReleasableAmount(
        bytes32 splitId,
        address beneficiary,
        address token
    ) internal view returns (uint256) {
        SplitConfig storage split = splits[splitId];
        VestingSchedule storage vesting = vestingSchedules[splitId][beneficiary];
        
        if (vesting.startTime == 0 || block.timestamp < vesting.startTime + vesting.cliffDuration) {
            return 0;
        }

        uint256 totalVested = 0;
        if (block.timestamp >= vesting.startTime + vesting.duration) {
            // Fully vested
            totalVested = vesting.totalAmount;
        } else {
            // Partially vested
            uint256 elapsedTime = block.timestamp - vesting.startTime - vesting.cliffDuration;
            uint256 vestingTime = vesting.duration - vesting.cliffDuration;
            totalVested = (vesting.totalAmount * elapsedTime) / vestingTime;
        }

        return totalVested - vesting.releasedAmount;
    }

    function _validateShares(uint256[] memory shares) internal pure returns (bool) {
        uint256 total = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            total += shares[i];
        }
        return total <= 10000; // 100% in basis points
    }

    function _initializeStandardSplits() internal {
        // Standard endorsement deal: 70% athlete, 10% agent, 15% school, 0% collective, 3% platform, 2% tax
        standardSplits["endorsement"] = [7000, 1000, 1500, 0, 300, 200];
        
        // Social media deal: 80% athlete, 5% agent, 10% school, 0% collective, 3% platform, 2% tax
        standardSplits["social"] = [8000, 500, 1000, 0, 300, 200];
        
        // Appearance deal: 65% athlete, 15% agent, 10% school, 5% collective, 3% platform, 2% tax
        standardSplits["appearance"] = [6500, 1500, 1000, 500, 300, 200];
        
        // Merchandise deal: 60% athlete, 10% agent, 20% school, 5% collective, 3% platform, 2% tax
        standardSplits["merchandise"] = [6000, 1000, 2000, 500, 300, 200];
        
        // Streaming/content: 85% athlete, 5% agent, 5% school, 0% collective, 3% platform, 2% tax
        standardSplits["streaming"] = [8500, 500, 500, 0, 300, 200];
    }

    // Emergency functions
    function pause() external onlyRole(ADMIN_ROLE) {
        // Pause all splits - implementation depends on requirements
    }

    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // View functions
    function getSplitDetails(bytes32 splitId)
        external
        view
        returns (
            address[] memory beneficiaries,
            uint256[] memory shares,
            uint256 lockDuration,
            uint256 cliffDuration,
            bool isActive
        )
    {
        SplitConfig storage split = splits[splitId];
        return (
            split.beneficiaries,
            split.shares,
            split.lockDuration,
            split.cliffDuration,
            split.isActive
        );
    }

    function getAccumulatedFunds(bytes32 splitId, address beneficiary)
        external
        view
        returns (uint256)
    {
        return splits[splitId].accumulatedFunds[beneficiary];
    }

    receive() external payable {
        // Allow contract to receive ETH
    }
}