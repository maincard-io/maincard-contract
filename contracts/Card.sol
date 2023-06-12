// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

import "./IArena.sol";
import "./ICard.sol";
import "./MainToken.sol";

contract Card is
    AccessControlUpgradeable,
    ICard,
    ERC721EnumerableUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using StringsUpgradeable for uint256;

    event RemainingLivesChanged(uint256 cardId, uint256 oldValue, uint256 newValue);

    IArena private _arenaAddress;
    CountersUpgradeable.Counter _lastMint;
    IERC20Upgradeable _acceptedCurrency;
    mapping(CardRarity => uint256) _prices;
    mapping(CardRarity => uint256) _upgradePrices;
    mapping(uint256 => CardRarity) _rarities;
    mapping(address => CardRarity) _mintAllowances;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ARENA_CHANGER_ROLE =
        keccak256("ARENA_CHANGER_ROLE");
    bytes32 public constant PRICE_MANAGER_ROLE =
        keccak256("PRICE_MANAGER_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    mapping(uint256 => uint256) _livesRemaining;

    function initialize() public initializer {
        __AccessControl_init();
        __ERC721_init("MainCard", "MCD");
        __ERC721Enumerable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Mapping from token ID to last results bitmap (with the lsb = the most recent game).
    mapping(uint256 => uint256) private _lastBetsPerformance;
    MainToken _maintoken;
    address _auctionAddress;

    struct CardInfo {
      // Much more to be added here on refactoring: lives remaining, rarity.
      uint8 recoveriesDone;
      uint64 frozenUntil;
    }
    mapping(uint256 => CardInfo) public _cardInfos;
    uint256 public _freeMintNonce;

    function setArenaAddress(IArena arena) external {
        require(
            hasRole(ARENA_CHANGER_ROLE, msg.sender),
            "msg.sender should have granted ARENA_CHANGER_ROLE"
        );
        _arenaAddress = arena;
    }
    function setMainTokenAddress(MainToken maintoken) external {
        require(
            hasRole(ARENA_CHANGER_ROLE, msg.sender),
            "msg.sender should have granted ARENA_CHANGER_ROLE"
        );
        _maintoken = maintoken;
    }
    function setAuctionAddress(address auction) external {
        require(
            hasRole(ARENA_CHANGER_ROLE, msg.sender),
            "msg.sender should have granted ARENA_CHANGER_ROLE"
        );
        _auctionAddress = auction;
    }

    // `a` is not more rare than `b`.
    function isLessRareOrEq(CardRarity a, CardRarity b) pure public returns (bool) {
        if (a == CardRarity.Common) return true;
        if (a == b) return true;
        if (a == CardRarity.Rare) return b == CardRarity.Legendary || b == CardRarity.Epic || b == CardRarity.Mythic;
        if (a == CardRarity.Epic) return b == CardRarity.Legendary || b == CardRarity.Mythic;
        if (a == CardRarity.Legendary) return b == CardRarity.Mythic;
        return false;
    }

    function setAcceptedCurrency(IERC20Upgradeable currency) external {
        require(
            hasRole(PRICE_MANAGER_ROLE, msg.sender),
            "msg.sender should have granted PRICE_MANAGER_ROLE"
        );
        _acceptedCurrency = currency;
    }

    function setTokenPrice(uint256 newTokenPrice, CardRarity rarity) external {
        require(
            hasRole(PRICE_MANAGER_ROLE, msg.sender),
            "msg.sender should have granted PRICE_MANAGER_ROLE"
        );
        _prices[rarity] = newTokenPrice;
    }
    function setTokenUpgradePrice(uint256 newTokenPrice, CardRarity rarity) external {
        require(
            hasRole(PRICE_MANAGER_ROLE, msg.sender),
            "msg.sender should have granted PRICE_MANAGER_ROLE"
        );
        _upgradePrices[rarity] = newTokenPrice;
    }

    function isApprovedForAll(address owner, address spender) public view override(IERC721Upgradeable, ERC721Upgradeable) returns (bool) {
        return (spender == address(_arenaAddress)) || super.isApprovedForAll(owner, spender);
    }

    function _mint(address newTokenOwner, CardRarity rarity) internal {
        // require(isLessRareOrEq(rarity, getMintAllowance(newTokenOwner)), "You have not uncovered the level");
        if (isLessRareOrEq(getMintAllowance(newTokenOwner), rarity)) {
            _mintAllowances[newTokenOwner] = rarity;
        }
        _safeMint(newTokenOwner, _lastMint.current());
        _rarities[_lastMint.current()] = rarity;
        _livesRemaining[_lastMint.current()] = getDefaultLivesForNewCard(rarity);
        emit RemainingLivesChanged(_lastMint.current(), 0, _livesRemaining[_lastMint.current()]);
        _lastMint.increment();
    }

    function mint(CardRarity rarity) external payable {
        require(rarity != CardRarity.Mythic, "Mythic is not buyable");
        require(_prices[rarity] > 0, "Price is not set");
        require(msg.value == _prices[rarity], 
                string(abi.encodePacked("Not enough funds ",
                                        StringsUpgradeable.toString(msg.value),
                                        " vs. ",
                                        StringsUpgradeable.toString(_prices[rarity]))));
        _mint(msg.sender, rarity);
        // _acceptedCurrency.transferFrom(msg.sender, address(this), _prices[rarity]);
    }

    function freeMint(address newTokenOwner, CardRarity rarity) external {
        // FreeMint should not call freeMint2, because it will increment the nonce,
        // but nonce is stored in the database and needed as a sync between DB and blockchain.
        require(
            hasRole(MINTER_ROLE, msg.sender),
            "msg.sender should have granted MINTER_ROLE"
        );
        require(rarity != CardRarity.Mythic, "Mythic cards are not buyable");
        _mint(newTokenOwner, rarity);
    }

    function freeMint2(address newTokenOwner, CardRarity rarity, uint256 freeMintNonce) external {
        require(
            hasRole(MINTER_ROLE, msg.sender),
            "msg.sender should have granted MINTER_ROLE"
        );
        require(rarity != CardRarity.Mythic, "Mythic cards are not buyable");
        require(freeMintNonce == _freeMintNonce, "Nonce is not correct");
        _freeMintNonce++;
        _mint(newTokenOwner, rarity);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 cardId,
        bytes memory data
    ) public override(ERC721Upgradeable, IERC721Upgradeable) {
        require(
            _isApprovedOrOwner(_msgSender(), cardId),
            "ERC721: caller is not token owner nor approved"
        );
        require(_cardInfos[cardId].frozenUntil <= block.timestamp, "The card is frozen");
        /*
        if (_rarities[cardId] == CardRarity.Common && !(
                to == address(_arenaAddress) || 
                to == address(_auctionAddress))) {
            // No easy way to check if `to` is a wallet, but we know that if it is a contract,
            // it will ask for approval first.
            require(
                getApproved(cardId) == address(0x0) &&
                    !isApprovedForAll(ownerOf(cardId), to),
                "Common cards are not transferrable"
            );
        }
        */
        if (from == address(_arenaAddress)) {
            (IArena.PredictionResult result, uint64 eventDate) = abi.decode(
                data,
                (IArena.PredictionResult, uint64)
            );
            if (result == IArena.PredictionResult.Success) {
                _lastBetsPerformance[cardId] =
                    (_lastBetsPerformance[cardId] &
                        0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff) *
                    2 +
                    1;
            } else if (result == IArena.PredictionResult.Failure) {
                _lastBetsPerformance[cardId] =
                    (_lastBetsPerformance[cardId] &
                        0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff) *
                    2;
                require(_livesRemaining[cardId] > 0, "Somehow card with 0 lives was used");
                emit RemainingLivesChanged(cardId, _livesRemaining[cardId], _livesRemaining[cardId]-1);
                _livesRemaining[cardId] -= 1;
                _cardInfos[cardId].frozenUntil = eventDate + freezePeriod(_rarities[cardId]);
            }
        }
        if (isLessRareOrEq(getMintAllowance(to), getRarity(cardId))) {
            _mintAllowances[to] = getRarity(cardId);
        }
        _safeTransfer(from, to, cardId, data);
    }

    function unsetFreeze(uint256 cardId) external {
        _cardInfos[cardId].frozenUntil = 0;
    }

    function withdraw() external {
        require(
            hasRole(WITHDRAWER_ROLE, msg.sender),
            "msg.sender should have granted WITHDRAWER_ROLE"
        );
        (bool sent, /* memory data */) = payable(msg.sender).call{value: address(this).balance}("");
        require(sent, "Failed to send Matic");
        // payable(msg.sender).transfer(address(this).balance);
        // _acceptedCurrency.transfer(msg.sender, _acceptedCurrency.balanceOf(msg.sender));
    }

    function getLastConsequentWins(uint256 tokenId)
        public
        view
        returns (uint8)
    {
        uint256 performance = _lastBetsPerformance[tokenId];
        uint256 mask = 0;
        for (uint8 i = 1; i <= 50; ++i) {
            mask = mask * 2 + 1;
            if (performance & mask != mask)
                return i - 1;
        }
        return 50;
    }

    function getBetsStatistics(uint256 tokenId) public view returns (uint256) {
        return _lastBetsPerformance[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(
            AccessControlUpgradeable,
            IERC165Upgradeable,
            ERC721EnumerableUpgradeable
        )
        returns (bool)
    {
        return AccessControlUpgradeable.supportsInterface(interfaceId) ||
               ERC721EnumerableUpgradeable.supportsInterface(interfaceId);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "http://maincard.io/cards/";
    }

    function burn(uint256 tokenId) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not token owner nor approved"
        );
        delete _rarities[tokenId];
        _burn(tokenId);
    }

    function upgrade(uint256 cardId1, uint256 cardId2) external payable {
        require(_isApprovedOrOwner(_msgSender(), cardId1), "not owner");
        require(_isApprovedOrOwner(_msgSender(), cardId2), "not owner");
        CardRarity rarity1 = getRarity(cardId1);
        CardRarity rarity2 = getRarity(cardId2);
        require(rarity1 == rarity2);
        uint256 card1Strike = getLastConsequentWins(cardId1);
        uint256 card2Strike = getLastConsequentWins(cardId2);
        CardRarity[5] memory raritiesToCheck = [CardRarity.Common, CardRarity.Rare, CardRarity.Epic, CardRarity.Legendary, CardRarity.Mythic];
        uint8[4] memory strikesToHave = [3, 6, 12, 25];
        for (uint256 i = 0; i < strikesToHave.length; ++i) {
            if (rarity1 == raritiesToCheck[i] && card1Strike >= strikesToHave[i] && card2Strike >= strikesToHave[i]) {
                burn(cardId1);
                burn(cardId2);
                if (isLessRareOrEq(getMintAllowance(msg.sender), raritiesToCheck[i+1])) {
                    _mintAllowances[msg.sender] = raritiesToCheck[i+1];
                }
                _mint(msg.sender, raritiesToCheck[i+1]);
                require(msg.value == _upgradePrices[raritiesToCheck[i]], string(abi.encodePacked(StringsUpgradeable.toString(msg.value), " vs ", StringsUpgradeable.toString(_upgradePrices[raritiesToCheck[i]]))));
                // _acceptedCurrency.transferFrom(msg.sender, address(this), _upgradePrices[raritiesToCheck[i+1]]);
                return;
            }
        }
        revert("Card is not eligible for upgrade");
    }

    function getRarity(uint256 cardId) public view returns(CardRarity) {
       require(_exists(cardId));
       return _rarities[cardId];
    }

    function getMintAllowance(address minter) public view returns(CardRarity) {
        if (_mintAllowances[minter] == CardRarity.Common) return CardRarity.Rare;
        return _mintAllowances[minter];
    }

    function getDefaultLivesForNewCard(CardRarity rarity) internal pure returns (uint8) {
        if (rarity == CardRarity.Common) return 2;
        if (rarity == CardRarity.Rare) return 3;
        if (rarity == CardRarity.Epic) return 4;
        if (rarity == CardRarity.Legendary) return 5;
        if (rarity == CardRarity.Mythic) return 10;
        revert("Unknown rarity");
    }

    function freezePeriod(CardRarity rarity) internal pure returns (uint32) {
        if (rarity == CardRarity.Common) return 3*3600;
        if (rarity == CardRarity.Rare) return 6*3600;
        if (rarity == CardRarity.Epic) return 12*3600;
        if (rarity == CardRarity.Legendary) return 24*3600;
        if (rarity == CardRarity.Mythic) return 48*3600;
        revert("Unknown rarity");
    }

    function livesRemaining(uint256 cardId) external view override returns(uint256) {
        return _livesRemaining[cardId];
    }

    function rewardMaintokens(uint256 cardId) external view returns(uint256) {
        uint256 curLivesRemaining = _livesRemaining[cardId];
        CardRarity rarity = _rarities[cardId];
        uint256 multiplier = uint256(10)**(_maintoken.decimals());
        if (rarity == CardRarity.Common) {
            uint8[3] memory t = [0, 1, 3];
            return t[curLivesRemaining] * multiplier;
        }
        if (rarity == CardRarity.Rare) {
            uint8[4] memory t = [0, 5, 10, 15];
            return t[curLivesRemaining] * multiplier;
        }
        if (rarity == CardRarity.Epic) {
            uint8[5] memory t = [0, 10, 25, 50, 75];
            return t[curLivesRemaining] * multiplier;
        }
        return curLivesRemaining * 100 * multiplier;
        /*
        if (rarity == CardRarity.Legendary) {
            uint256[6] memory t = [0, 50, 100, 150, 225, 300];
            return t[livesRemaining];
        }
        if (rarity == CardRarity.Mythic) {
            uint256[11] memory t = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
            return t[livesRemaining];
        }
        revert("Unknown rarity");
        */
    }

    function cardPrice(CardRarity rarity) external view returns(uint256) {
        require(_prices[rarity] > 0, "not buyable");
        return _prices[rarity];
    }
    
    function upgradePrice(CardRarity rarity) external view returns(uint256) {
        require(_upgradePrices[rarity] > 0, "not upgradeable");
        return _upgradePrices[rarity];
    }

    function recoveryMaintokens(uint256 cardId) public view returns(uint256) {
        return recoveryMatic(cardId) * 5;
    }

    function recoveryMatic(uint256 cardId) public view returns(uint256) {
        uint256 curLivesRemaining = _livesRemaining[cardId];
        CardRarity rarity = _rarities[cardId];
        uint256 multiplier = 10**(_maintoken.decimals());
        if (rarity == CardRarity.Common) {
            uint8[3] memory t = [2, 1, 0];
            return t[curLivesRemaining] * multiplier;
        }
        if (rarity == CardRarity.Rare) {
            uint8[4] memory t = [20, 10, 5, 0];
            return t[curLivesRemaining] * multiplier;
        }
        if (rarity == CardRarity.Epic) {
            uint8[5] memory t = [60, 50, 40, 30, 0];
            return t[curLivesRemaining] * multiplier;
        }
        if (rarity == CardRarity.Legendary) {
            uint8[6] memory t = [230, 200, 170, 140, 110, 0];
            return t[curLivesRemaining] * multiplier;
        }
        if (rarity == CardRarity.Mythic) {
            uint16[11] memory t = [1300, 1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 0];
            return t[curLivesRemaining] * multiplier;
        }
        revert("Unknown rarity");
    }

    /* Pay with MainTokens */
    function restoreLive(uint256 cardId) external {
        // If paid in MainTokens, price x5
        uint256 cost = recoveryMaintokens(cardId);
        require(cost > 0, "Nothing to restore");
        _maintoken.transferFrom(msg.sender, address(this), cost);
        _restoreLive(cardId);
    }

    /* Pay with MATIC */
    function restoreLiveMatic(uint256 cardId) external payable {
        uint256 cost = recoveryMatic(cardId);
        require(cost > 0, "Nothing to restore");
        require(msg.value == cost, "Not enough MATIC");
        _restoreLive(cardId);
    }

    function _restoreLive(uint256 cardId) internal {
        require(ownerOf(cardId) == msg.sender);
        require(_livesRemaining[cardId] > 0); /* BY WP same values */
        if (_livesRemaining[cardId] == 0) {
            _cardInfos[cardId].recoveriesDone += 1;
        }
        uint256 newLives = getDefaultLivesForNewCard(_rarities[cardId]);
        emit RemainingLivesChanged(cardId, _livesRemaining[cardId], newLives);
        _livesRemaining[cardId] = newLives;
    }

    function massApprove(address where, uint256[] calldata cardIds) external {
        for (uint256 i = 0; i < cardIds.length; ++i) {
            approve(where, cardIds[i]);
        }
    }

    receive() external payable {}
}
