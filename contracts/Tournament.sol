// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";

import "./ICard.sol";

contract Tournament is AccessControlUpgradeable {
    bytes32 public constant TOURNAMENT_MANAGER_ROLE =
        keccak256("TOURNAMENT_MANAGER_ROLE");

    IERC20Upgradeable public _token;
    ICard public _card;

    struct TournamentInfo {
        uint256 participationFee;
        bool isInitialized;
        ICard.CardRarity minRequiredRarity;
        uint256 rewardsCollected;
    }

    mapping(uint256 => TournamentInfo) public _torunamentInfos;
    mapping(uint256 => mapping(address => bool)) public _registeredPlayers;
    mapping(address => uint256) public _gasFreeOpCounter;

    event RegisteredForTournament(address indexed player, uint256 cardId);

    function initialize(
        IERC20Upgradeable token,
        ICard card
    ) public initializer {
        __AccessControl_init();
        _token = token;
        _card = card;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setTournamentRules(
        uint256 tournamentId,
        uint256 fee,
        ICard.CardRarity minRequiredRarity
    ) external {
        require(
            hasRole(TOURNAMENT_MANAGER_ROLE, msg.sender),
            "msg.sender should have granted TOURNAMENT_MANAGER_ROLE"
        );
        _torunamentInfos[tournamentId].isInitialized = true;
        _torunamentInfos[tournamentId].participationFee = fee;
        _torunamentInfos[tournamentId].minRequiredRarity = minRequiredRarity;
    }

    function completeTournament(
        uint256 tournamentId,
        address[] calldata winners,
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
            totalPayout >= _torunamentInfos[tournamentId].rewardsCollected,
            "Tournament: insufficient balance"
        );
        _torunamentInfos[tournamentId].rewardsCollected -= totalPayout;

        for (uint256 i = 0; i < winners.length; ++i) {
            require(
                _token.transfer(winners[i], payouts[i]),
                "Tournament: payout failed"
            );
        }
    }

    function registerForTournamentGasFree(
        uint256 cardId,
        uint256 tournamentId,
        address caller,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(
            _gasFreeOpCounter[caller],
            cardId,
            tournamentId
        );
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(originalMessage)
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == caller, "snec");
        ++_gasFreeOpCounter[caller];
        _registerForTournamentCoreNoFees(cardId, tournamentId, caller);
        require(
            _token.transferFrom(
                caller,
                address(this),
                _torunamentInfos[tournamentId].participationFee
            )
        );
        _torunamentInfos[tournamentId].rewardsCollected += _torunamentInfos[
            tournamentId
        ].participationFee;
    }

    function massRegisterForTournamentGasFree(
        uint256[] calldata cardId,
        uint256 tournamentId,
        address caller,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(
            _gasFreeOpCounter[caller]
        );
        for (uint256 i = 0; i < cardId.length; ++i) {
            originalMessage = abi.encodePacked(originalMessage, cardId[i]);
        }
        originalMessage = abi.encodePacked(originalMessage, tournamentId);
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(originalMessage)
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == caller, "snec");
        ++_gasFreeOpCounter[caller];
        for (uint256 i = 0; i < cardId.length; ++i) {
            _registerForTournamentCoreNoFees(cardId[i], tournamentId, caller);
        }
        require(
            _token.transferFrom(
                caller,
                address(this),
                _torunamentInfos[tournamentId].participationFee * cardId.length
            )
        );
        _torunamentInfos[tournamentId].rewardsCollected += _torunamentInfos[
            tournamentId
        ].participationFee * cardId.length;
    }

    function _registerForTournamentCoreNoFees(
        uint256 cardId,
        uint256 tournamentId,
        address caller
    ) internal {
        require(_card.ownerOf(cardId) == caller, "Tournament: not owner");
        require(
            _torunamentInfos[tournamentId].isInitialized,
            "Tournament: not started"
        );
        require(
            _card.isLessRareOrEq(
                _torunamentInfos[tournamentId].minRequiredRarity,
                _card.getRarity(cardId)
            ),
            "Tournament: wrong rarity"
        );
        // To avoid double fees
        require(
            _registeredPlayers[tournamentId][caller] == false,
            "Tournament: already registered"
        );
        _registeredPlayers[tournamentId][caller] == true;
        emit RegisteredForTournament(caller, cardId);
    }
}
