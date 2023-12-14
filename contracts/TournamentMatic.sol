// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";

import "./ICard.sol";

contract TournamentMatic is AccessControlUpgradeable {
    bytes32 public constant TOURNAMENT_MANAGER_ROLE =
        keccak256("TOURNAMENT_MANAGER_ROLE");

    ICard public _card;

    struct TournamentInfo {
        uint256 rewardsCollected;
        uint256 participationFee;
        uint8 requiredCardsAmount;
        ICard.CardRarity minRequiredRarity;
    }

    mapping(uint256 => TournamentInfo) public _torunamentInfos;
    mapping(uint256 => mapping(address => bool)) public _registeredPlayers;

    event RegisteredForTournament(address indexed player, uint256 tournamentId, uint256 cardId);

    function initialize(
        ICard card
    ) public initializer {
        __AccessControl_init();
        _card = card;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setTournamentRules(
        uint256 tournamentId,
        uint256 fee,
        ICard.CardRarity minRequiredRarity,
        uint8 requiredCardsAmount
    ) external {
        require(
            hasRole(TOURNAMENT_MANAGER_ROLE, msg.sender),
            "msg.sender should have granted TOURNAMENT_MANAGER_ROLE"
        );
        _torunamentInfos[tournamentId].participationFee = fee;
        _torunamentInfos[tournamentId].minRequiredRarity = minRequiredRarity;
        _torunamentInfos[tournamentId].requiredCardsAmount = requiredCardsAmount;
    }

    function completeTournament(
        uint256 tournamentId,
        address payable[] calldata winners,
        uint256[] calldata payouts
    ) external {
        require(
            hasRole(TOURNAMENT_MANAGER_ROLE, msg.sender),
            "msg.sender should have granted TOURNAMENT_MANAGER_ROLE"
        );
        require(
            winners.length == payouts.length,
            "Tournament: winners and payouts length mismatch"
        );
        uint256 totalPayout = 0;
        for (uint256 i = 0; i < winners.length; ++i) {
            require(
                _registeredPlayers[tournamentId][winners[i]],
                "Tournament: winner is not registered"
            );
            totalPayout += payouts[i];
        }
        require(
            totalPayout <= _torunamentInfos[tournamentId].rewardsCollected,
            "Tournament: insufficient balance"
        );
        _torunamentInfos[tournamentId].rewardsCollected -= totalPayout;

        for (uint256 i = 0; i < winners.length; ++i) {
            (bool success, ) = winners[i].call{value: payouts[i]}("");
            require(success, "Tournament: payout failed");
        }
    }

    function registerForTournament(
        uint256[] calldata cardIds,
        uint256 tournamentId
    ) external payable {
        require(
            _torunamentInfos[tournamentId].requiredCardsAmount > 0,
            "Tournament: not started"
        );
        require(
            cardIds.length == _torunamentInfos[tournamentId].requiredCardsAmount,
            "Tournament: wrong cards amount"
        );

        for (uint256 i = 0; i < cardIds.length; ++i) {
            // Make sure all cards are unique:
            for (uint256 j = i + 1; j < cardIds.length; ++j) {
                require(cardIds[i] != cardIds[j], "Tournament: duplicate cards");
            }

            require(_card.ownerOf(cardIds[i]) == msg.sender, "Tournament: not owner");
            require(
                _card.isLessRareOrEq(
                    _torunamentInfos[tournamentId].minRequiredRarity,
                    _card.getRarity(cardIds[i])
                ),
                "Tournament: wrong rarity"
            );
            _registeredPlayers[tournamentId][msg.sender] = true;
            emit RegisteredForTournament(msg.sender, tournamentId, cardIds[i]);
        }
        require(msg.value == _torunamentInfos[tournamentId].participationFee, "Tournament: wrong fee");
        _torunamentInfos[tournamentId].rewardsCollected += msg.value;
    }
}
