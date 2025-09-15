// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title MultiCurrencyHandler
 * @notice Handles multiple currencies, stablecoins, and RWA tokens for global NIL deals
 * @dev Supports fiat-pegged stablecoins, crypto assets, and Real World Asset tokens
 */
contract MultiCurrencyHandler is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant CURRENCY_MANAGER_ROLE = keccak256("CURRENCY_MANAGER_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");
    bytes32 public constant RWA_MANAGER_ROLE = keccak256("RWA_MANAGER_ROLE");

    // Events
    event CurrencyAdded(
        string indexed currencyCode,
        address indexed tokenAddress,
        uint8 decimals,
        bool isStablecoin
    );
    
    event ExchangeRateUpdated(
        string indexed fromCurrency,
        string indexed toCurrency,
        uint256 rate,
        uint256 timestamp
    );
    
    event RWATokenCreated(
        string indexed assetType,
        address indexed tokenAddress,
        uint256 totalValue,
        uint256 tokenSupply
    );
    
    event CurrencyConverted(
        bytes32 indexed transactionId,
        string indexed fromCurrency,
        string indexed toCurrency,
        uint256 fromAmount,
        uint256 toAmount,
        address recipient
    );

    event SponsorshipPoolTokenized(
        bytes32 indexed poolId,
        address indexed tokenAddress,
        uint256 totalValue,
        uint256 tokenSupply,
        string jurisdiction
    );

    // Structs
    struct Currency {
        string code; // "USD", "EUR", "GBP", "JPY", "ETH", "MATIC", etc.
        string name; // "US Dollar", "Euro", "Ethereum", etc.
        address tokenAddress; // ERC20 token address (0x0 for native tokens)
        uint8 decimals; // Token decimals
        bool isStablecoin; // True for USDC, USDT, DAI, etc.
        bool isFiat; // True for fiat-pegged tokens
        bool isCrypto; // True for crypto assets
        bool isRWA; // True for Real World Asset tokens
        bool active; // Whether currency is currently supported
        uint256 dailyVolumeLimit; // Daily volume limit in base currency
        string jurisdiction; // Primary jurisdiction for this currency
    }

    struct ExchangeRate {
        uint256 rate; // Exchange rate with 18 decimal precision
        uint256 lastUpdated; // Timestamp of last update
        address oracle; // Price oracle address
        bool isReliable; // Whether the rate is reliable
        uint256 deviation; // Allowed deviation percentage (basis points)
    }

    struct RWAToken {
        string assetType; // "sponsorship_pool", "future_earnings", "brand_partnership"
        string assetName; // Human readable name
        address tokenAddress; // ERC20 token representing the RWA
        uint256 totalAssetValue; // Total value of underlying asset
        uint256 tokenSupply; // Total token supply
        string jurisdiction; // Legal jurisdiction
        bytes32 legalDocumentHash; // Hash of legal documentation
        address custodian; // Legal custodian of the underlying asset
        uint256 maturityDate; // When the RWA can be redeemed (0 if perpetual)
        bool active; // Whether the RWA token is active
    }

    struct SponsorshipPool {
        bytes32 poolId;
        string poolName;
        address[] sponsors; // List of sponsor addresses
        uint256[] contributions; // Corresponding contribution amounts
        address tokenAddress; // Fractionalized token address
        uint256 totalValue; // Total pool value
        uint256 athleteAllocation; // Percentage allocated to athletes (basis points)
        uint256 schoolAllocation; // Percentage allocated to schools (basis points)
        string targetJurisdiction; // Target jurisdiction for the pool
        bool isActive;
        uint256 createdAt;
    }

    struct ConversionRequest {
        bytes32 requestId;
        string fromCurrency;
        string toCurrency;
        uint256 fromAmount;
        uint256 expectedToAmount;
        address recipient;
        uint256 maxSlippage; // Maximum slippage in basis points
        uint256 deadline; // Conversion deadline timestamp
        bool executed;
        uint256 executedAt;
    }

    // State variables
    mapping(string => Currency) public currencies;
    mapping(bytes32 => ExchangeRate) public exchangeRates; // keccak256(fromCode, toCode)
    mapping(bytes32 => RWAToken) public rwaTokens; // keccak256(assetType, tokenAddress)
    mapping(bytes32 => SponsorshipPool) public sponsorshipPools;
    mapping(bytes32 => ConversionRequest) public conversionRequests;
    
    string[] public supportedCurrencies;
    mapping(string => bool) public currencyExists;
    
    address public priceOracle; // Chainlink or other price oracle
    string public baseCurrency; // Base currency for calculations (e.g., "USD")

    constructor(address _priceOracle) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CURRENCY_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_MANAGER_ROLE, msg.sender);
        _grantRole(RWA_MANAGER_ROLE, msg.sender);
        
        priceOracle = _priceOracle;
        baseCurrency = "USD";
        
        // Initialize common currencies
        _initializeCurrencies();
    }

    /**
     * @notice Add a new supported currency
     */
    function addCurrency(
        string memory code,
        string memory name,
        address tokenAddress,
        uint8 decimals,
        bool isStablecoin,
        bool isFiat,
        bool isCrypto,
        bool isRWA,
        uint256 dailyLimit,
        string memory jurisdiction
    ) external onlyRole(CURRENCY_MANAGER_ROLE) {
        require(!currencyExists[code], "Currency already exists");
        
        currencies[code] = Currency({
            code: code,
            name: name,
            tokenAddress: tokenAddress,
            decimals: decimals,
            isStablecoin: isStablecoin,
            isFiat: isFiat,
            isCrypto: isCrypto,
            isRWA: isRWA,
            active: true,
            dailyVolumeLimit: dailyLimit,
            jurisdiction: jurisdiction
        });
        
        supportedCurrencies.push(code);
        currencyExists[code] = true;
        
        emit CurrencyAdded(code, tokenAddress, decimals, isStablecoin);
    }

    /**
     * @notice Update exchange rate between two currencies
     */
    function updateExchangeRate(
        string memory fromCurrency,
        string memory toCurrency,
        uint256 rate
    ) external onlyRole(ORACLE_MANAGER_ROLE) {
        require(currencyExists[fromCurrency] && currencyExists[toCurrency], "Currency not supported");
        
        bytes32 rateKey = keccak256(abi.encodePacked(fromCurrency, toCurrency));
        
        exchangeRates[rateKey] = ExchangeRate({
            rate: rate,
            lastUpdated: block.timestamp,
            oracle: msg.sender,
            isReliable: true,
            deviation: 500 // 5% default deviation
        });
        
        emit ExchangeRateUpdated(fromCurrency, toCurrency, rate, block.timestamp);
    }

    /**
     * @notice Convert between currencies with slippage protection
     */
    function convertCurrency(
        string memory fromCurrency,
        string memory toCurrency,
        uint256 fromAmount,
        address recipient,
        uint256 maxSlippage,
        uint256 deadline
    ) external nonReentrant returns (bytes32 requestId, uint256 toAmount) {
        require(block.timestamp <= deadline, "Conversion deadline passed");
        require(currencyExists[fromCurrency] && currencyExists[toCurrency], "Currency not supported");
        
        // Calculate conversion amount
        toAmount = _calculateConversion(fromCurrency, toCurrency, fromAmount);
        
        // Check slippage
        uint256 slippage = _calculateSlippage(fromAmount, toAmount, fromCurrency, toCurrency);
        require(slippage <= maxSlippage, "Slippage exceeds maximum");
        
        requestId = keccak256(abi.encodePacked(
            msg.sender,
            fromCurrency,
            toCurrency,
            fromAmount,
            block.timestamp
        ));
        
        // Store conversion request
        conversionRequests[requestId] = ConversionRequest({
            requestId: requestId,
            fromCurrency: fromCurrency,
            toCurrency: toCurrency,
            fromAmount: fromAmount,
            expectedToAmount: toAmount,
            recipient: recipient,
            maxSlippage: maxSlippage,
            deadline: deadline,
            executed: false,
            executedAt: 0
        });
        
        // Execute the conversion
        _executeConversion(requestId, fromCurrency, toCurrency, fromAmount, toAmount, recipient);
        
        emit CurrencyConverted(requestId, fromCurrency, toCurrency, fromAmount, toAmount, recipient);
    }

    /**
     * @notice Create RWA token for real world assets
     */
    function createRWAToken(
        string memory assetType,
        string memory assetName,
        address tokenAddress,
        uint256 totalAssetValue,
        uint256 tokenSupply,
        string memory jurisdiction,
        bytes32 legalDocumentHash,
        address custodian,
        uint256 maturityDate
    ) external onlyRole(RWA_MANAGER_ROLE) returns (bytes32 rwaId) {
        rwaId = keccak256(abi.encodePacked(assetType, tokenAddress));
        
        rwaTokens[rwaId] = RWAToken({
            assetType: assetType,
            assetName: assetName,
            tokenAddress: tokenAddress,
            totalAssetValue: totalAssetValue,
            tokenSupply: tokenSupply,
            jurisdiction: jurisdiction,
            legalDocumentHash: legalDocumentHash,
            custodian: custodian,
            maturityDate: maturityDate,
            active: true
        });
        
        // Add as currency if not exists
        if (!currencyExists[assetType]) {
            _addRWAasCurrency(assetType, assetName, tokenAddress, jurisdiction);
        }
        
        emit RWATokenCreated(assetType, tokenAddress, totalAssetValue, tokenSupply);
    }

    /**
     * @notice Create tokenized sponsorship pool for collective funding
     */
    function createSponsorshipPool(
        string memory poolName,
        address[] memory sponsors,
        uint256[] memory contributions,
        uint256 athleteAllocation,
        uint256 schoolAllocation,
        string memory jurisdiction,
        address tokenAddress
    ) external onlyRole(RWA_MANAGER_ROLE) returns (bytes32 poolId) {
        require(sponsors.length == contributions.length, "Mismatched arrays");
        require(athleteAllocation + schoolAllocation <= 10000, "Invalid allocation percentages");
        
        poolId = keccak256(abi.encodePacked(poolName, block.timestamp));
        
        // Calculate total value
        uint256 totalValue = 0;
        for (uint256 i = 0; i < contributions.length; i++) {
            totalValue += contributions[i];
        }
        
        sponsorshipPools[poolId] = SponsorshipPool({
            poolId: poolId,
            poolName: poolName,
            sponsors: sponsors,
            contributions: contributions,
            tokenAddress: tokenAddress,
            totalValue: totalValue,
            athleteAllocation: athleteAllocation,
            schoolAllocation: schoolAllocation,
            targetJurisdiction: jurisdiction,
            isActive: true,
            createdAt: block.timestamp
        });
        
        emit SponsorshipPoolTokenized(poolId, tokenAddress, totalValue, totalValue, jurisdiction);
    }

    /**
     * @notice Get exchange rate between two currencies
     */
    function getExchangeRate(
        string memory fromCurrency,
        string memory toCurrency
    ) external view returns (uint256 rate, uint256 lastUpdated, bool isReliable) {
        bytes32 rateKey = keccak256(abi.encodePacked(fromCurrency, toCurrency));
        ExchangeRate memory exchangeRate = exchangeRates[rateKey];
        
        return (exchangeRate.rate, exchangeRate.lastUpdated, exchangeRate.isReliable);
    }

    /**
     * @notice Calculate conversion amount between currencies
     */
    function calculateConversion(
        string memory fromCurrency,
        string memory toCurrency,
        uint256 fromAmount
    ) external view returns (uint256 toAmount) {
        return _calculateConversion(fromCurrency, toCurrency, fromAmount);
    }

    /**
     * @notice Get supported currencies
     */
    function getSupportedCurrencies() external view returns (string[] memory) {
        return supportedCurrencies;
    }

    /**
     * @notice Check if currency is supported
     */
    function isCurrencySupported(string memory currencyCode) external view returns (bool) {
        return currencyExists[currencyCode] && currencies[currencyCode].active;
    }

    /**
     * @notice Get sponsorship pool details
     */
    function getSponsorshipPool(bytes32 poolId) external view returns (SponsorshipPool memory) {
        return sponsorshipPools[poolId];
    }

    // Internal functions
    function _calculateConversion(
        string memory fromCurrency,
        string memory toCurrency,
        uint256 fromAmount
    ) internal view returns (uint256) {
        if (keccak256(bytes(fromCurrency)) == keccak256(bytes(toCurrency))) {
            return fromAmount;
        }
        
        bytes32 directRateKey = keccak256(abi.encodePacked(fromCurrency, toCurrency));
        ExchangeRate memory directRate = exchangeRates[directRateKey];
        
        if (directRate.rate > 0 && directRate.isReliable) {
            return (fromAmount * directRate.rate) / 1e18;
        }
        
        // Try inverse rate
        bytes32 inverseRateKey = keccak256(abi.encodePacked(toCurrency, fromCurrency));
        ExchangeRate memory inverseRate = exchangeRates[inverseRateKey];
        
        if (inverseRate.rate > 0 && inverseRate.isReliable) {
            return (fromAmount * 1e18) / inverseRate.rate;
        }
        
        // Try via base currency (USD)
        if (keccak256(bytes(fromCurrency)) != keccak256(bytes(baseCurrency)) &&
            keccak256(bytes(toCurrency)) != keccak256(bytes(baseCurrency))) {
            
            uint256 baseAmount = _calculateConversion(fromCurrency, baseCurrency, fromAmount);
            return _calculateConversion(baseCurrency, toCurrency, baseAmount);
        }
        
        revert("No exchange rate available");
    }

    function _calculateSlippage(
        uint256 fromAmount,
        uint256 toAmount,
        string memory fromCurrency,
        string memory toCurrency
    ) internal view returns (uint256) {
        bytes32 rateKey = keccak256(abi.encodePacked(fromCurrency, toCurrency));
        ExchangeRate memory rate = exchangeRates[rateKey];
        
        if (rate.rate == 0) return 0;
        
        uint256 expectedAmount = (fromAmount * rate.rate) / 1e18;
        
        if (expectedAmount == 0) return 10000; // 100% slippage if expected is zero
        
        if (toAmount >= expectedAmount) return 0;
        
        return ((expectedAmount - toAmount) * 10000) / expectedAmount;
    }

    function _executeConversion(
        bytes32 requestId,
        string memory fromCurrency,
        string memory toCurrency,
        uint256 fromAmount,
        uint256 toAmount,
        address recipient
    ) internal {
        Currency memory fromCurr = currencies[fromCurrency];
        Currency memory toCurr = currencies[toCurrency];
        
        // Transfer tokens from sender
        if (fromCurr.tokenAddress != address(0)) {
            IERC20(fromCurr.tokenAddress).transferFrom(msg.sender, address(this), fromAmount);
        }
        
        // Transfer converted tokens to recipient
        if (toCurr.tokenAddress != address(0)) {
            IERC20(toCurr.tokenAddress).transfer(recipient, toAmount);
        }
        
        // Mark conversion as executed
        conversionRequests[requestId].executed = true;
        conversionRequests[requestId].executedAt = block.timestamp;
    }

    function _addRWAasCurrency(
        string memory assetType,
        string memory assetName,
        address tokenAddress,
        string memory jurisdiction
    ) internal {
        currencies[assetType] = Currency({
            code: assetType,
            name: assetName,
            tokenAddress: tokenAddress,
            decimals: 18, // Standard for RWA tokens
            isStablecoin: false,
            isFiat: false,
            isCrypto: false,
            isRWA: true,
            active: true,
            dailyVolumeLimit: type(uint256).max, // No limit for RWA by default
            jurisdiction: jurisdiction
        });
        
        supportedCurrencies.push(assetType);
        currencyExists[assetType] = true;
        
        emit CurrencyAdded(assetType, tokenAddress, 18, false);
    }

    function _initializeCurrencies() internal {
        // USD Stablecoins
        _addBaseCurrency("USDC", "USD Coin", 0x0000000000000000000000000000000000000001, 6, true, true, false, false, "US");
        _addBaseCurrency("USDT", "Tether USD", 0x0000000000000000000000000000000000000002, 6, true, true, false, false, "US");
        _addBaseCurrency("DAI", "Dai Stablecoin", 0x0000000000000000000000000000000000000003, 18, true, true, false, false, "US");
        
        // EUR Stablecoins  
        _addBaseCurrency("EURS", "STASIS EURO", 0x0000000000000000000000000000000000000004, 2, true, true, false, false, "EU");
        
        // Crypto Assets
        _addBaseCurrency("ETH", "Ethereum", address(0), 18, false, false, true, false, "GLOBAL");
        _addBaseCurrency("MATIC", "Polygon", 0x0000000000000000000000000000000000000005, 18, false, false, true, false, "GLOBAL");
        
        // Initialize basic exchange rates (would be updated by oracles)
        bytes32 usdcEth = keccak256(abi.encodePacked("USDC", "ETH"));
        exchangeRates[usdcEth] = ExchangeRate(2000 * 1e18, block.timestamp, address(this), true, 500);
    }

    function _addBaseCurrency(
        string memory code,
        string memory name,
        address tokenAddress,
        uint8 decimals,
        bool isStablecoin,
        bool isFiat,
        bool isCrypto,
        bool isRWA,
        string memory jurisdiction
    ) internal {
        currencies[code] = Currency({
            code: code,
            name: name,
            tokenAddress: tokenAddress,
            decimals: decimals,
            isStablecoin: isStablecoin,
            isFiat: isFiat,
            isCrypto: isCrypto,
            isRWA: isRWA,
            active: true,
            dailyVolumeLimit: 10000000 * 10**decimals, // 10M default limit
            jurisdiction: jurisdiction
        });
        
        supportedCurrencies.push(code);
        currencyExists[code] = true;
    }
}