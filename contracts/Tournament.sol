// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";

contract Tournament is AccessControlUpgradeable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IERC20Upgradeable public _token;
    IERC721Upgradeable public _card;
    uint16 public _tournamentId;

    mapping(uint256 => uint256) public _rewards;
    uint256 public _tournamentParticipationFee;
    mapping(uint256 => mapping(address => bool)) public _registeredPlayers;

    event RegisteredForTournament(address indexed player, uint256 cardId);

    function initialize(
        IERC20Upgradeable token,
        IERC721Upgradeable card
    ) public initializer {
        __AccessControl_init();
        _token = token;
        _card = card;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setTournamentParticipationFee(uint256 fee) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "msg.sender should have granted MINTER_ROLE"
        ); 
        _tournamentParticipationFee = fee;
    }

    function completeTournament(
        address[] calldata winners,
        uint256[] calldata payouts
    ) external {
        require(
            hasRole(MINTER_ROLE, msg.sender),
            "msg.sender should have granted MINTER_ROLE"
        ); 
        require(
            winners.length == payouts.length,
            "Tournament: winners and payouts length mismatch"
        );
        uint256 totalPayout = 0;
        for (uint256 i = 0; i < winners.length; ++i) {
            require(
                _registeredPlayers[_tournamentId][winners[i]],
                "Tournament: winner is not registered"
            );
            totalPayout += payouts[i];
        }
        require(
            totalPayout <= _rewards[_tournamentId],
            "Tournament: insufficient balance"
        );
        for (uint256 i = 0; i < winners.length; ++i) {
            require(
                _token.transfer(winners[i], payouts[i]),
                "Tournament: payout failed"
            );
        }
        ++_tournamentId;
    }

    function registerForTournament(uint256 cardId) external {
        // TODO: check participation schedule
        require(_card.ownerOf(cardId) == msg.sender, "Tournament: not owner");
        require(
            _registeredPlayers[_tournamentId][msg.sender] == false,
            "Tournament: already registered"
        );
        require(
            _token.transferFrom(
                msg.sender,
                address(this),
                _tournamentParticipationFee
            )
        );
        _registeredPlayers[_tournamentId][msg.sender] = true;
        _rewards[_tournamentId] += _tournamentParticipationFee;
        emit RegisteredForTournament(msg.sender, cardId);
    }
}
