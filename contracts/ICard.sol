// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

interface ICard is IERC721Upgradeable {
    enum CardRarity {
        Common,
        Rare,
        Epic,
        Legendary,
        Mythic,
        Demo
    }

    function livesRemaining(uint256 cardId) external view returns(uint256);
    function getRarity(uint256 cardId) external view returns(CardRarity);
    function rewardMaintokens(uint256 cardId) external view returns(uint256);
    function recoveryMaintokens(uint256 cardId) external view returns(uint256);

    // `a` is not more rare than `b`.
    function isLessRareOrEq(CardRarity a, CardRarity b) pure external returns (bool);
}