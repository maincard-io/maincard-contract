// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

import "./IArena.sol";
import "./ICard.sol";
import "./MainToken.sol";

contract Card is AccessControlUpgradeable, ICard, ERC721EnumerableUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using StringsUpgradeable for uint256;

    event RemainingLivesChanged(
        uint256 cardId,
        uint256 oldValue,
        uint256 newValue
    );
    event NewCardMinted(CardRarity rarity, uint256 cardId, uint256 timestamp);
    event NewPartnersCardMinted(CardRarity rarity, uint256 cardId, uint256 timestamp, uint256 partnerId);

    error MissingRequiredRole(bytes32);
    error MythicCardIsNotBuyable();
    error PriceForRarityNotSet(CardRarity);
    error IncorrectValue(uint256 currentValue, uint256 expectedValue);
    error OperationNotPermittedForDemoCard();
    error IncorrectNonce(uint256 expectedNonce);
    error CardIsFrozen(uint256 cardId);
    error CardHasZeroLives(uint256 cardId);
    error CanNotBurnDemoYet(uint256 cardId, uint256 cardCreatedTs);
    error NotImplementedForRarity(CardRarity);
    error NothingToRestore();
    error CardsFromDifferentPartnersNotMergeable(uint256 card1Id, uint256 card2Id);
    error NotCardOwner(address sender, uint256 cardId);
    error FailedToSendMatic();
    error NotUpgradable(uint256 cardId1, uint256 cardId2);
    error WrongSignature();

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
    mapping(address => uint256) public gasFreeOpCounter;
    mapping(uint256 => uint256) public _demoCardsActivationTimes; // TODO : to be merged with _cardInfos
    mapping(uint256 => uint256) public partnerIDsForCard;  // TODO : to be merged with _cardInfos

    function setControlAddresses(
        IArena arena,
        MainToken maintoken,
        address auction
    ) external {
        if (!hasRole(ARENA_CHANGER_ROLE, msg.sender)) {
            revert MissingRequiredRole(ARENA_CHANGER_ROLE);
        }
        _arenaAddress = arena;
        _maintoken = maintoken;
        _auctionAddress = auction;
    }

    // `a` is not more rare than `b`.
    function isLessRareOrEq(
        CardRarity a,
        CardRarity b
    ) public pure returns (bool) {
        if (a == CardRarity.Common) return true;
        if (a == CardRarity.Demo) return true;
        if (a == b) return true;
        if (a == CardRarity.Rare)
            return
                b == CardRarity.Legendary ||
                b == CardRarity.Epic ||
                b == CardRarity.Mythic;
        if (a == CardRarity.Epic)
            return b == CardRarity.Legendary || b == CardRarity.Mythic;
        if (a == CardRarity.Legendary) return b == CardRarity.Mythic;
        return false;
    }

    function setAcceptedCurrency(IERC20Upgradeable currency) external {
        if (!hasRole(PRICE_MANAGER_ROLE, msg.sender)) {
            revert MissingRequiredRole(PRICE_MANAGER_ROLE);
        }
        _acceptedCurrency = currency;
    }

    function setTokenPrice(uint256 newTokenPrice, CardRarity rarity) external {
        if (!hasRole(PRICE_MANAGER_ROLE, msg.sender)) {
            revert MissingRequiredRole(PRICE_MANAGER_ROLE);
        }
        _prices[rarity] = newTokenPrice;
    }

    function setTokenUpgradePrice(
        uint256 newTokenPrice,
        CardRarity rarity
    ) external {
        if (!hasRole(PRICE_MANAGER_ROLE, msg.sender)) {
            revert MissingRequiredRole(PRICE_MANAGER_ROLE);
        }
        _upgradePrices[rarity] = newTokenPrice;
    }

    function isApprovedForAll(
        address owner,
        address spender
    )
        public
        view
        override(IERC721Upgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return
            (spender == address(_arenaAddress)) ||
            (spender == address(_auctionAddress)) ||
            super.isApprovedForAll(owner, spender);
    }

    function _mint(address newTokenOwner, CardRarity rarity, uint256 partnerId) internal returns (uint256) {
        // Originally we had a logic to allow minting only if the user has already
        // reached the level of the card. However, it was decided to remove this.
        // So we used to have:
        //   - _mintAllowances is only updated when merging cards
        //   - _mintAllowances is checked when buying a card
        // But now we don't have it. Although to maintain _mintAllowances in a consistent
        // state, we are just populating it on every mint.

        // require(isLessRareOrEq(rarity, getMintAllowance(newTokenOwner)), "You have not uncovered the level");
        uint tokenId = _lastMint.current();
    
        if (isLessRareOrEq(getMintAllowance(newTokenOwner), rarity)) {
            _mintAllowances[newTokenOwner] = rarity;
        }

        if (rarity == CardRarity.Demo) {
            _demoCardsActivationTimes[tokenId] = block.timestamp;
        }
        _safeMint(newTokenOwner, tokenId);
        _rarities[tokenId] = rarity;
        _livesRemaining[tokenId] = getDefaultLivesForNewCard(
            rarity
        );
        partnerIDsForCard[tokenId] = partnerId;

        emit NewCardMinted(rarity, tokenId, block.timestamp);
        emit NewPartnersCardMinted(rarity, tokenId, block.timestamp, partnerId);
        emit RemainingLivesChanged(
            tokenId,
            0,
            _livesRemaining[tokenId]
        );

        _lastMint.increment();
        return tokenId;
    }

    function _isDemoCardStillAlive(
        uint256 cardId
    ) internal view returns (bool) {
        require(_rarities[cardId] == CardRarity.Demo);
        return block.timestamp - _demoCardsActivationTimes[cardId] < 14 days;
    }

    function burnCard(uint256 cardId) external {
        if (_rarities[cardId] == CardRarity.Demo) {
            if (_isDemoCardStillAlive(cardId)) {
                revert CanNotBurnDemoYet(
                    cardId,
                    _demoCardsActivationTimes[cardId]
                );
            }
            _burn(cardId);
        }
    }

    function mint(CardRarity rarity) external payable {
        if (rarity == CardRarity.Mythic) {
            revert MythicCardIsNotBuyable();
        }
        if (_prices[rarity] == 0) {
            revert PriceForRarityNotSet(rarity);
        }
        if (msg.value != _prices[rarity]) {
            revert IncorrectValue(msg.value, _prices[rarity]);
        }
        _mint(msg.sender, rarity, 0);
        // _acceptedCurrency.transferFrom(msg.sender, address(this), _prices[rarity]);
    }

    function freeMint(address newTokenOwner, CardRarity rarity) external {
        if (!hasRole(MINTER_ROLE, msg.sender)) {
            revert MissingRequiredRole(MINTER_ROLE);
        }
        if (rarity == CardRarity.Mythic) {
            revert MythicCardIsNotBuyable();
        }
        _mint(newTokenOwner, rarity, 0);
    }

    function freePartnersMint(address newTokenOwner, CardRarity rarity, uint256 partnerId) external {
        if (!hasRole(MINTER_ROLE, msg.sender)) {
            revert MissingRequiredRole(MINTER_ROLE);
        }
        if (rarity == CardRarity.Mythic) {
            revert MythicCardIsNotBuyable();
        }
        _mint(newTokenOwner, rarity, partnerId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 cardId,
        bytes memory data
    ) public override(ERC721Upgradeable, IERC721Upgradeable) {
        if (!_isApprovedOrOwner(_msgSender(), cardId)) {
            revert NotCardOwner(_msgSender(), cardId);
        }
        if (_cardInfos[cardId].frozenUntil > block.timestamp) {
            revert CardIsFrozen(cardId);
        }
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
                if (_livesRemaining[cardId] == 0) {
                    revert CardHasZeroLives(cardId);
                }
                emit RemainingLivesChanged(
                    cardId,
                    _livesRemaining[cardId],
                    _livesRemaining[cardId] - 1
                );
                _livesRemaining[cardId] -= 1;
                _cardInfos[cardId].frozenUntil =
                    eventDate +
                    freezePeriod(_rarities[cardId]);
            }
        }
        if (isLessRareOrEq(getMintAllowance(to), getRarity(cardId))) {
            _mintAllowances[to] = getRarity(cardId);
        }
        _safeTransfer(from, to, cardId, data);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstCardId,
        uint256 batchSize
    ) internal override {
        for (uint256 cardId = firstCardId; cardId < firstCardId + batchSize; ) {
            bool permitted = true;
            if (_rarities[cardId] == CardRarity.Demo) {
                if (_isDemoCardStillAlive(cardId)) {
                    permitted =
                        from == address(0) ||
                        from == address(_arenaAddress) ||
                        to == address(0) ||
                        to == address(_arenaAddress);
                } else {
                    permitted = to == address(0);
                }
            }

            if (!permitted) {
                revert OperationNotPermittedForDemoCard();
            }
            unchecked {
                ++cardId;
            }
        }
        super._beforeTokenTransfer(from, to, firstCardId, batchSize);
    }

    function unsetFreeze(uint256 cardId) external {
        _cardInfos[cardId].frozenUntil = 0;
    }

    function withdraw() external {
        if (!hasRole(WITHDRAWER_ROLE, msg.sender)) {
            revert MissingRequiredRole(WITHDRAWER_ROLE);
        }
        (bool sent /* memory data */, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        if (!sent) {
            revert FailedToSendMatic();
        }
        // payable(msg.sender).transfer(address(this).balance);
        // _acceptedCurrency.transfer(msg.sender, _acceptedCurrency.balanceOf(msg.sender));
    }

    function getLastConsequentWins(
        uint256 tokenId
    ) public view returns (uint8) {
        uint256 performance = _lastBetsPerformance[tokenId];
        uint256 mask = 0;
        for (uint8 i = 1; i <= 50; ++i) {
            mask = mask * 2 + 1;
            if (performance & mask != mask) return i - 1;
        }
        return 50;
    }

    function getBetsStatistics(uint256 tokenId) public view returns (uint256) {
        return _lastBetsPerformance[tokenId];
    }

    function supportsInterface(
        bytes4 interfaceId
    )
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
        return
            AccessControlUpgradeable.supportsInterface(interfaceId) ||
            ERC721EnumerableUpgradeable.supportsInterface(interfaceId);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "http://maincard.io/cards/";
    }

    function burn(uint256 tokenId) public {
        if (!_isApprovedOrOwner(_msgSender(), tokenId)) {
            revert NotCardOwner(_msgSender(), tokenId);
        }
        delete _rarities[tokenId];
        _burn(tokenId);
    }

    function upgrade(uint256 cardId1, uint256 cardId2) external payable {
        if (!_isApprovedOrOwner(_msgSender(), cardId1) || !_isApprovedOrOwner(_msgSender(), cardId2)) {
            revert NotCardOwner(_msgSender(), 0);
        }
        CardRarity rarity1 = getRarity(cardId1);
        CardRarity rarity2 = getRarity(cardId2);
        require(rarity1 == rarity2);
        if (msg.value != _upgradePrices[rarity1]) {
            revert IncorrectValue(
                msg.value,
                _upgradePrices[rarity1]
            );
        }
        uint256 newPartnerID = 0;
        if (partnerIDsForCard[cardId1] != 0) {
            if (partnerIDsForCard[cardId1] != partnerIDsForCard[cardId2] && partnerIDsForCard[cardId2] != 0) {
                revert CardsFromDifferentPartnersNotMergeable(partnerIDsForCard[cardId1], partnerIDsForCard[cardId2]);
            }
            newPartnerID = partnerIDsForCard[cardId1];
        } else {
            newPartnerID = partnerIDsForCard[cardId2];
        }
        uint256 card1Strike = getLastConsequentWins(cardId1);
        uint256 card2Strike = getLastConsequentWins(cardId2);
        uint8[4] memory strikesToHave = [3, 6, 12, 25];
        if (uint8(rarity1) >= strikesToHave.length || (
            card1Strike < strikesToHave[uint8(rarity1)] &&
            card2Strike < strikesToHave[uint8(rarity1)]
        )) {
            revert NotUpgradable(cardId1, cardId2);
        }

        burn(cardId1);
        burn(cardId2);
        if (
            isLessRareOrEq(
                getMintAllowance(msg.sender),
                CardRarity(uint8(rarity1) + 1)
            )
        ) {
            _mintAllowances[msg.sender] = CardRarity(uint8(rarity1) + 1);
        }
        _mint(msg.sender, CardRarity(uint8(rarity1) + 1), newPartnerID);
    }

    function getRarity(uint256 cardId) public view returns (CardRarity) {
        require(_exists(cardId));
        return _rarities[cardId];
    }

    function getMintAllowance(address minter) public view returns (CardRarity) {
        if (_mintAllowances[minter] == CardRarity.Common)
            return CardRarity.Rare;
        if (_mintAllowances[minter] == CardRarity.Demo) return CardRarity.Demo;
        return _mintAllowances[minter];
    }

    function getDefaultLivesForNewCard(
        CardRarity rarity
    ) internal pure returns (uint8) {
        uint8[6] memory t = [2, 3, 4, 5, 10, 2];
        uint8 result = t[uint8(rarity)];
        if (result == 0)
            revert NotImplementedForRarity(rarity);
        return result;
    }

    function freezePeriod(CardRarity rarity) public pure returns (uint32) {
        uint8[6] memory t = [3, 6, 12, 24, 48, 3];
        uint8 result = t[uint8(rarity)];
        if (result == 0)
            revert NotImplementedForRarity(rarity);
        return result * 3600;
    }

    function livesRemaining(
        uint256 cardId
    ) external view override returns (uint256) {
        return _livesRemaining[cardId];
    }

    function rewardMaintokens(uint256 cardId, uint256 odd) external view returns (uint256) {
        uint256 curLivesRemaining = _livesRemaining[cardId];
        CardRarity rarity = _rarities[cardId];
        uint256 multiplier;

        if (odd >= 351) {
            multiplier = 30; // Insane, эквивалентно x3
        } else if (odd >= 251) {
            multiplier = 15; // Hard, эквивалентно x1.5
        } else if (odd >= 171) {
            multiplier = 10; // Medium, эквивалентно x1
        } else if (odd >= 131) {
            multiplier = 5; // Easy, эквивалентно x0.5
        } else {
            return 0;
            // multiplier = 0; // Obvious, эквивалентно x0
        }
        multiplier = multiplier * (10 ** (_maintoken.decimals()));

        if (rarity == CardRarity.Common || rarity == CardRarity.Demo) {
            uint8[3] memory t = [0, 5, 10];
            return t[curLivesRemaining] * multiplier / 10;
        }
        if (rarity == CardRarity.Rare) {
            uint8[4] memory t = [0, 9, 15, 25];
            return t[curLivesRemaining] * multiplier / 10;
        }
        if (rarity == CardRarity.Epic) {
            uint8[5] memory t = [0, 20, 30, 50, 75];
            return t[curLivesRemaining] * multiplier / 10;
        }
        if (rarity == CardRarity.Legendary) {
            uint8[6] memory t = [0, 50, 80, 120, 175, 250];
            return t[curLivesRemaining] * multiplier / 10;
        }
        if (rarity == CardRarity.Mythic) {
            uint16[11] memory t = [
                0,
                75,
                100,
                140,
                180,
                240,
                320,
                420,
                560,
                750,
                1000
            ];
            return t[curLivesRemaining] * multiplier / 10;
        }
        return curLivesRemaining * 10 * multiplier;
    }

    function cardPrice(CardRarity rarity) external view returns (uint256) {
        require(_prices[rarity] > 0);
        return _prices[rarity];
    }

    function upgradePrice(CardRarity rarity) external view returns (uint256) {
        require(_upgradePrices[rarity] > 0);
        return _upgradePrices[rarity];
    }

    function recoveryMaintokens(uint256 cardId) public view returns (uint256) {
        return recoveryMatic(cardId) * 5;
    }

    function recoveryMatic(uint256 cardId) public view returns (uint256) {
        uint256 curLivesRemaining = _livesRemaining[cardId];
        CardRarity rarity = _rarities[cardId];
        uint256 multiplier = 10 ** (_maintoken.decimals());
        if (rarity == CardRarity.Common || rarity == CardRarity.Demo) {
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
            uint16[11] memory t = [
                1300,
                1200,
                1100,
                1000,
                900,
                800,
                700,
                600,
                500,
                400,
                0
            ];
            return t[curLivesRemaining] * multiplier;
        }
        revert NotImplementedForRarity(rarity);
    }

    /* Pay with MainTokens */
    function restoreLive(uint256 cardId) external {
        // If paid in MainTokens, price x5
        uint256 cost = recoveryMaintokens(cardId);
        if (cost == 0) {
            revert NothingToRestore();
        }
        _maintoken.transferFrom(msg.sender, address(this), cost);
        _restoreLive(cardId, msg.sender);
    }

    function restoreLiveGasFree(
        uint256 cardId,
        address caller,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(
            gasFreeOpCounter[caller],
            cardId
        );
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(originalMessage)
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        if (signer != caller) revert WrongSignature();
        ++gasFreeOpCounter[caller];

        uint256 cost = recoveryMaintokens(cardId);
        if (cost == 0) {
            revert NothingToRestore();
        }
        _maintoken.transferFrom(signer, address(this), cost);
        _restoreLive(cardId, signer);
    }

    /* Pay with MATIC */
    function restoreLiveMatic(uint256 cardId) external payable {
        uint256 cost = recoveryMatic(cardId);
        if (cost == 0) {
            revert NothingToRestore();
        }
        if (msg.value != cost) {
            revert IncorrectValue(msg.value, cost);
        }
        _restoreLive(cardId, msg.sender);
    }

    function _restoreLive(uint256 cardId, address signer) internal {
        if (ownerOf(cardId) != signer) {
            revert NotCardOwner(signer, cardId);
        }
        uint256 newLives = getDefaultLivesForNewCard(_rarities[cardId]);
        emit RemainingLivesChanged(cardId, _livesRemaining[cardId], newLives);
        _livesRemaining[cardId] = newLives;
    }

    function recoveriesRemaining(uint256) public pure returns (uint8) {
        return 100;
    }

    function massApprove(address where, uint256[] calldata cardIds) external {
        for (uint256 i = 0; i < cardIds.length; ++i) {
            approve(where, cardIds[i]);
        }
    }

    receive() external payable {}
}
