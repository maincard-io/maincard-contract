// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IArena {
    enum MatchResult {
        MatchIsInProgress,
        MatchCancelled,
        FirstWon,
        Draw,
        SecondWon
    }

    /* NotApplicable is used when user withdraws before the match start or the match got cancelled */
    enum PredictionResult {
        Success,
        Failure,
        NotApplicable
    }

    function createEvent(uint256 eventId, uint256 betsAcceptedUntilTs, bytes32 descriptionHash) external;
    function makeBet(uint256 eventId, uint256 cardId, MatchResult choiceId) external;
    function setEventResult(uint256 eventId, MatchResult resultChoiceId) external;
    function takeCard(uint cardId) external;

    function createCall(uint256 eventId, uint256 cardId, MatchResult choiceId) external;
    function acceptCall(uint256 callId, uint256 cardId) external;
    function claimCall(uint256 cardId) external;
}
