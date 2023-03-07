const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");

const Regular = 0;
const Rare = 1;
const Epic = 2;
const Legendary = 3;
const Mythic = 4;

describe("Basic tests", function () {
    let instance, maintoken;
    let admin, alice, bob

    before(async () => {
        [admin, alice, bob] = await ethers.getSigners();

        const Card = await ethers.getContractFactory("Card");
        instance = await upgrades.deployProxy(Card);
        const MainToken = await ethers.getContractFactory("MainToken");
        maintoken = await upgrades.deployProxy(MainToken);

        const MINTER_ROLE = await instance.MINTER_ROLE();
        const grantMinterRoleTx = await instance.grantRole(MINTER_ROLE, alice.address);
        await grantMinterRoleTx.wait();
        const PRICE_MANAGER_ROLE = await instance.PRICE_MANAGER_ROLE();
        const grantPriceManagerRoleTx = await instance.grantRole(PRICE_MANAGER_ROLE, bob.address);
        await grantPriceManagerRoleTx.wait();
    });

    it("Bob Can set price", async () => {
        const contractAsBob = await instance.connect(bob);
        const setPriceTx = await contractAsBob.setTokenPrice(20, 0);
        await setPriceTx.wait();
    });
    it("Admin Can not set price", async () => {
        await expect(instance.setTokenPrice(20, 0)).to.be.revertedWith("msg.sender should have granted PRICE_MANAGER_ROLE");
    });

    it("Alice can mint free tokens", async () => {
        const contractAsAlice = await instance.connect(alice);
        const mintTx = await contractAsAlice.freeMint(alice.address, Regular);
        await mintTx.wait();
    });
    it("Alice can mint free tokens via freeMint2", async () => {
        const contractAsAlice = await instance.connect(alice);
        const mintTx1 = await contractAsAlice.freeMint2(alice.address, Regular, 0);
        await mintTx1.wait();
        const mintTx2 = await contractAsAlice.freeMint2(alice.address, Regular, 1);
        await mintTx2.wait();
    });
    it("Alice cannot mint free tokens via freeMint2 is nonce is incorrect", async () => {
        const contractAsAlice = await instance.connect(alice);
        await expect(contractAsAlice.freeMint2(alice.address, Regular, 1)).to.be.reverted;
    })
    it("Bob can not mint free tokens", async () => {
        const contractAsBob = await instance.connect(bob);
        await expect(contractAsBob.freeMint(alice.address, Regular)).to.be.reverted;
    });

    it("Allows everyone to buy tokens if they provide money", async () => {
        const contractAsBob = await instance.connect(bob);
        const setPriceTx = await contractAsBob.setTokenPrice(BigNumber.from("20000000000000000000"), Regular);
        const buyTx = await contractAsBob.mint(Regular, {value: "20000000000000000000"});
        const effects = await buyTx.wait();
        expect(effects.events.filter(e => e.event === "Transfer")).length.above(0);
    });
    it("Does not allow to buy tokens if they don't provide money", async () => {
        const contractAsBob = await instance.connect(bob);
        const setPriceTx = await contractAsBob.setTokenPrice(20, Regular);
        await setPriceTx.wait();

        await expect(contractAsBob.mint(Regular)).to.be.reverted;
    });

    it("Allows to transfer token", async () => {
        const contractAsAlice = await instance.connect(alice);
        const balanceOfAliceBefore = await instance.balanceOf(alice.address);
        const mintTx = await contractAsAlice.freeMint(alice.address, Regular);
        const mintEffects = await mintTx.wait();
        const mintedTokenId = mintEffects.events.filter(e => e.event === "Transfer")[0].args[2];
        const balanceOfAliceAfter = await instance.balanceOf(alice.address);
        expect(balanceOfAliceAfter.sub(balanceOfAliceBefore).valueOf()).to.be.equal(1);
        expect((await instance.tokenOfOwnerByIndex(alice.address, balanceOfAliceBefore /* because it is the index of the last one */))).to.be.equal(mintedTokenId);
        const transferTx = await contractAsAlice.transferFrom(alice.address, admin.address, mintedTokenId);
        await transferTx.wait();
        const tokenOwner = await contractAsAlice.ownerOf(mintedTokenId);
        expect(tokenOwner).to.be.equal(admin.address);
    });

    it("Does not allow to upgrade a Regular Card", async () => {
        const contractAsAlice = await instance.connect(alice);
        const mintTx = await contractAsAlice.freeMint(alice.address, Regular);
        const mintEffects = await mintTx.wait();
        const mintedTokenId1 = mintEffects.events.filter(e => e.event === "Transfer")[0].args[2];
        const mintTx2 = await contractAsAlice.freeMint(alice.address, Regular);
        const mintEffects2 = await mintTx2.wait();
        const mintedTokenId2 = mintEffects2.events.filter(e => e.event === "Transfer")[0].args[2];
        await expect(contractAsAlice.upgrade(mintedTokenId1, mintedTokenId2)).to.be.reverted;
    });

    it("Lists all cards from Alice", async () => {
        const aliceBalance = await instance.balanceOf(alice.address);
        expect(aliceBalance > BigNumber.from("1")).to.be.true;
        for (let i = BigNumber.from("0"); i < aliceBalance; ++i) {
            /* const info = */ await instance.tokenOfOwnerByIndex(alice.address, i);
        }
    });

    it("Allows to new user to mint Regular, Rare", async () => {
        const contractAsBob = await instance.connect(bob);
        const setPriceRegularTx = await contractAsBob.setTokenPrice(BigNumber.from("20000000000000000000"), Regular);
        await setPriceRegularTx.wait();
        const setPriceRareTx = await contractAsBob.setTokenPrice(BigNumber.from("70000000000000000000"), Rare);
        await setPriceRareTx.wait();
        const setPriceEpicTx = await contractAsBob.setTokenPrice(BigNumber.from("200000000000000000000"), Epic);
        await setPriceEpicTx.wait();

        const newUser = ethers.Wallet.createRandom().connect(alice.provider);
        const fundUser = await alice.sendTransaction({to: newUser.address, value: "700000000000000000000"});

        for (let [rarity, px] of [[Regular, "20000000000000000000"], [Rare, "70000000000000000000"]]) {
            const mintTx = await instance.connect(newUser).mint(rarity, {value: px});
            await mintTx.wait();
        }
    });
    
    it("Does not allow to new user to mint Epic, Legendary, Mythic", async () => {
        const contractAsBob = await instance.connect(bob);
        const setPriceRegularTx = await contractAsBob.setTokenPrice(BigNumber.from("20000000000000000000"), Regular);
        await setPriceRegularTx.wait();
        const setPriceRareTx = await contractAsBob.setTokenPrice(BigNumber.from("70000000000000000000"), Rare);
        await setPriceRareTx.wait();
        const setPriceEpicTx = await contractAsBob.setTokenPrice(BigNumber.from("200000000000000000000"), Epic);
        await setPriceEpicTx.wait();

        const newUser = ethers.Wallet.createRandom().connect(alice.provider);
        const fundUser = await alice.sendTransaction({to: newUser.address, value: "1000000000000000000"});
        await fundUser.wait();

        for (let rarity of [Epic, Legendary, Mythic]) {
            await expect(instance.connect(newUser).mint(rarity)).to.be.reverted;
        }
    });
});

describe("Arena tests", () => {
    let card, arena, maintoken;
    let arenaAsAlice;
    let admin, alice, bob;
    let lastEvent = 0;
    let createEvent;
    let cardId;
    let legendaryCardIdBelongingToAlice;

    const FirstWon = 2;
    const SecondWon = 4;

    // block.timestamp = 1657490343 @ 7/10/2022 <- (new Date()).valueOf() / 1000
    let currentBlockTime;
    const halfHour = 1800;
    const oneHour = 3600;
    const twoDays = 2 * 24 * 3600;

    before(async () => {
        [admin, alice, bob] = await ethers.getSigners();

        const Card = await ethers.getContractFactory("Card");
        card = await upgrades.deployProxy(Card);
        const Arena = await ethers.getContractFactory("Arena");
        arena = await upgrades.deployProxy(Arena);
        const MainToken = await ethers.getContractFactory("MainToken");
        maintoken = await upgrades.deployProxy(MainToken);

        const ARENA_CHANGER_ROLE = await card.ARENA_CHANGER_ROLE();
        const grantArenaChangerRoleTx = await card.grantRole(ARENA_CHANGER_ROLE, admin.address);
        await grantArenaChangerRoleTx.wait();

        const setArenaTx = await card.setArenaAddress(arena.address);
        await setArenaTx.wait();
        const setCardTx = await arena.setCardAddress(card.address);
        await setCardTx.wait();

        const MINTER_ROLE = await card.MINTER_ROLE();
        const grantMinterRoleTx = await card.grantRole(MINTER_ROLE, admin.address);
        await grantMinterRoleTx.wait();

        const PRICE_MANAGER_ROLE = await card.PRICE_MANAGER_ROLE();
        const grantPriceManagerRoleTx = await card.grantRole(PRICE_MANAGER_ROLE, admin.address);
        await grantPriceManagerRoleTx.wait();

        createEvent = async (betsUntil) => {
            lastEvent = lastEvent + 1;
            const createEventTx = await arena.createEvent(lastEvent, betsUntil, "0xff00000000000000000000000000000000000000000000000000000000000000");
            await createEventTx.wait();
            return lastEvent;
        }

        const mintTx = await card.freeMint(alice.address, Regular);
        const mintEffects = await mintTx.wait();
        cardId = mintEffects.events.filter(e => e.event === "Transfer")[0].args[2];

        arenaAsAlice = arena.connect(alice);

        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        currentBlockTime = blockBefore.timestamp;

        const MT_MINTER_ROLE = await maintoken.MINTER_ROLE();
        const grantMinterRoleOfMainTokenToArena = await maintoken.grantRole(MT_MINTER_ROLE, arena.address);
        await grantMinterRoleOfMainTokenToArena.wait();

        const setMainTokenTx = await arena.setMainToken(maintoken.address);
        await setMainTokenTx.wait();
        const setMainTokenCardTx = await card.setMainTokenAddress(maintoken.address);
        await setMainTokenCardTx.wait();

        legendaryCardIdBelongingToAlice = await getLegendaryCardForAlice();
    });

    const getLegendaryCardForAlice = async () => {
        const cardAsAlice = card.connect(alice);
        const setPriceTx = await card.setTokenPrice(BigNumber.from("20000000000000000000"), Regular);
        await setPriceTx.wait();
        
        const regularCards = [];
        for (let i = 0; i < 2; ++i) {
            const mintTx = await cardAsAlice.mint(Regular, {value: "20000000000000000000"});
            const mintEffects = await mintTx.wait();
            regularCards.push(mintEffects.events.filter(e => e.event === "Transfer")[0].args[2]);
        }
        for (const regularCardId of regularCards) {
            for (let roundNum = 0; roundNum < 3; ++roundNum) {
                // Sending
                let eventId = await createEvent(currentBlockTime + halfHour);
                const cardApproveTx = await cardAsAlice.approve(arenaAsAlice.address, regularCardId)
                await cardApproveTx.wait()
                const makeBetTx = await arenaAsAlice.makeBet(eventId, regularCardId, FirstWon);
                await makeBetTx.wait();
                // Winning
                await ethers.provider.send('evm_increaseTime', [oneHour]);
                currentBlockTime = currentBlockTime + oneHour;
                await ethers.provider.send('evm_mine');
                const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
                await setFirstWonTx.wait();
                // Receiving
                let takeCardTx = await arenaAsAlice.takeCard(regularCardId);
                await takeCardTx.wait();
            }
        }
        const setUpdatePriceTx = await card.setTokenUpgradePrice(BigNumber.from("200000000000000000000"), Regular);
        await setUpdatePriceTx.wait();

        const rareCards = [];
        const upgradeToRareTx = await cardAsAlice.upgrade(...regularCards, {value: "200000000000000000000"});
        const upgrade1Effects = await upgradeToRareTx.wait();
        rareCards.push(upgrade1Effects.events.filter(e => e.event === "Transfer" && e.args[1] == alice.address)[0].args[2]);

        const setRarePriceTx = await card.setTokenPrice(BigNumber.from("2000000000000000000000"), Rare);
        await setRarePriceTx.wait();

        const mintRareTx = await cardAsAlice.mint(Rare, {value: "2000000000000000000000"});
        const mintRareEffects = await mintRareTx.wait();
        rareCards.push(mintRareEffects.events.filter(e => e.event === "Transfer" && e.args[1] == alice.address)[0].args[2]);

        for (const rareCardId of rareCards) {
            for (let roundNum = 0; roundNum < 6; ++roundNum) {
                // Sending
                let eventId = await createEvent(currentBlockTime + halfHour);
                await cardAsAlice.approve(arenaAsAlice.address, rareCardId)
                const makeBetTx = await arenaAsAlice.makeBet(eventId, rareCardId, FirstWon);
                await makeBetTx.wait();
                // Winning
                await ethers.provider.send('evm_increaseTime', [oneHour]);
                currentBlockTime = currentBlockTime + oneHour;
                await ethers.provider.send('evm_mine');
                const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
                await setFirstWonTx.wait();
                // Receiving
                let takeCardTx = await arenaAsAlice.takeCard(rareCardId);
                await takeCardTx.wait();
            }
        }

        const setUpdateToLegendaryPriceTx = await card.setTokenUpgradePrice(BigNumber.from("2000000000000000000000"), Rare);
        await setUpdateToLegendaryPriceTx.wait();

        const upgradeToLegendaryTx = await cardAsAlice.upgrade(...rareCards, {value: "2000000000000000000000"});
        const upgrade2Effects = await upgradeToLegendaryTx.wait();
        return upgrade2Effects.events.filter(e => e.event === "Transfer" && e.args[1] == alice.address)[0].args[2];
    };

    it("Sending, winning and receiving, sending, losing and receiving", async () => {
        const cardAsAlice = card.connect(alice)

        // Sending
        let eventId = await createEvent(currentBlockTime + halfHour);
        await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
        const makeFirstBetTx = await arenaAsAlice.makeBet(eventId, cardId, FirstWon);
        await makeFirstBetTx.wait();
        let cardOwner = await card.ownerOf(cardId);
        expect(cardOwner).to.be.equal(arena.address);
        // Alice is not controlling the card anymore.
        await expect(cardAsAlice.functions['safeTransferFrom(address,address,uint256)'](alice.address, admin.address, cardId)).to.be.reverted;
        const cardIdRecorded = await arenaAsAlice.betsByUser(alice.address, 0);
        await expect(cardIdRecorded).to.be.equal(cardId);

        // Winning
        await ethers.provider.send('evm_increaseTime', [oneHour]);
        currentBlockTime = currentBlockTime + oneHour;
        await ethers.provider.send('evm_mine');
        const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
        await setFirstWonTx.wait();

        // Receiving
        const alicesMaintokenBalanceBefore = await maintoken.balanceOf(alice.address);
        let takeCardTx = await arenaAsAlice.takeCard(cardId);
        await takeCardTx.wait();
        cardOwner = await card.ownerOf(cardId);
        expect(cardOwner).to.be.equal(alice.address);
        let wonCompetitions = await card.getLastConsequentWins(cardId);
        expect(wonCompetitions).to.be.equal(1);
        const alicesMaintokenBalanceAfter = await maintoken.balanceOf(alice.address);
        expect(alicesMaintokenBalanceAfter.sub(alicesMaintokenBalanceBefore).toString()).to.be.equal("5000000000000000000");
        const livesRemaining = await card.livesRemaining(cardId);
        expect(livesRemaining).to.be.equal(2);
        
        // Sending
        eventId = await createEvent(currentBlockTime + halfHour);
        await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
        const makeSecondBetTx = await arenaAsAlice.makeBet(eventId, cardId, SecondWon);
        await makeSecondBetTx.wait();

        // Losing
        await ethers.provider.send('evm_increaseTime', [oneHour]);
        currentBlockTime = currentBlockTime + oneHour;
        await ethers.provider.send('evm_mine');
        const setFirstWonTx2 = await arena.setEventResult(eventId, FirstWon);
        await setFirstWonTx2.wait();

        // Receiving
        const alicesMaintokenBalanceBeforeLosing = await maintoken.balanceOf(alice.address);
        takeCardTx = await arenaAsAlice.takeCard(cardId);
        await takeCardTx.wait();
        wonCompetitions = await card.getLastConsequentWins(cardId);
        expect(wonCompetitions).to.be.equal(0);
        let statistics = await card.getBetsStatistics(cardId);
        expect(statistics).to.be.equal(2);
        const alicesMaintokenBalanceAfterLosing = await maintoken.balanceOf(alice.address);
        expect(alicesMaintokenBalanceAfterLosing.sub(alicesMaintokenBalanceBeforeLosing).toString()).to.be.equal("0");
        const livesRemainingAfterLosing = await card.livesRemaining(cardId);
        expect(livesRemainingAfterLosing).to.be.equal(1);

        // Sending
        eventId = await createEvent(currentBlockTime + twoDays + halfHour);
        await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
        // Sending within cooloff period.
        await expect(arenaAsAlice.makeBet(eventId, cardId, SecondWon)).to.be.reverted;
        await ethers.provider.send('evm_increaseTime', [twoDays]);
        currentBlockTime = currentBlockTime + twoDays;
        await ethers.provider.send('evm_mine');
        let makeBetTx = await arenaAsAlice.makeBet(eventId, cardId, SecondWon);
        await makeBetTx.wait();

        // And taking before the match starts.
        takeCardTx = await arenaAsAlice.takeCard(cardId);
        await takeCardTx.wait();
        wonCompetitions = await card.getLastConsequentWins(cardId);
        expect(wonCompetitions).to.be.equal(0);
        statistics = await card.getBetsStatistics(cardId);
        expect(statistics).to.be.equal(2);

        // Sending
        eventId = await createEvent(currentBlockTime + halfHour);
        await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
        makeBetTx = await arenaAsAlice.makeBet(eventId, cardId, SecondWon);
        await makeBetTx.wait();
        // Winning
        await ethers.provider.send('evm_increaseTime', [oneHour]);
        currentBlockTime = currentBlockTime + oneHour;
        await ethers.provider.send('evm_mine');
        let setResultTx = await arena.setEventResult(eventId, SecondWon);
        await setResultTx.wait();
        // Receiving
        const alicesMaintokenBalanceWinningWith1Life = await maintoken.balanceOf(alice.address);
        takeCardTx = await arenaAsAlice.takeCard(cardId);
        await takeCardTx.wait();
        wonCompetitions = await card.getLastConsequentWins(cardId);
        expect(wonCompetitions).to.be.equal(1);
        statistics = await card.getBetsStatistics(cardId);
        expect(statistics).to.be.equal(5);
        const alicesMaintokenBalanceAfterWinningWith1Life = await maintoken.balanceOf(alice.address);
        expect(alicesMaintokenBalanceAfterWinningWith1Life.sub(alicesMaintokenBalanceWinningWith1Life).toString()).to.be.equal("3000000000000000000");
        // Sending
        eventId = await createEvent(currentBlockTime + halfHour);
        await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
        makeBetTx = await arenaAsAlice.makeBet(eventId, cardId, SecondWon);
        await makeBetTx.wait();
        // Winning
        await ethers.provider.send('evm_increaseTime', [oneHour]);
        currentBlockTime = currentBlockTime + oneHour;
        await ethers.provider.send('evm_mine');
        setResultTx = await arena.setEventResult(eventId, SecondWon);
        await setResultTx.wait();
        expect(await arenaAsAlice.betsByAddressCount(admin.address)).to.be.equal(0);
        expect(await arenaAsAlice.betsByAddressCount(alice.address)).to.be.equal(1);
        const [[[betEventId, betChoice, betOwner]]] = await arenaAsAlice.betsByAddressAndIndex(alice.address, 0);
        expect(betEventId.valueOf()).to.be.equal(eventId.valueOf());
        expect(betChoice).to.be.equal(SecondWon);
        expect(betOwner).to.be.equal(alice.address);
        // Receiving
        takeCardTx = await arenaAsAlice.takeCard(cardId);
        await takeCardTx.wait();
        wonCompetitions = await card.getLastConsequentWins(cardId);
        expect(wonCompetitions).to.be.equal(2);
        statistics = await card.getBetsStatistics(cardId);
        expect(statistics).to.be.equal(11);
    });

    it("Does not allow alice to set event result", async () => {
        const eventId = await createEvent(currentBlockTime + halfHour);
        await expect(arenaAsAlice.setEventResult(eventId, FirstWon)).to.be.reverted;
    })

    it("Does not allow to place two regular cards", async () => {
        const cardAsAlice = card.connect(alice);

        const mintTx = await card.freeMint(alice.address, Regular);
        const mintEffects = await mintTx.wait();
        const newCardId = mintEffects.events.filter(e => e.event === "Transfer")[0].args[2];

        const eventId = await createEvent(currentBlockTime + halfHour);
        await cardAsAlice.approve(arenaAsAlice.address, newCardId)
        const makeBetTx = await arenaAsAlice.makeBet(eventId, newCardId, SecondWon);
        await makeBetTx.wait();

        await cardAsAlice.approve(arenaAsAlice.address, cardId)
        await expect(arenaAsAlice.makeBet(eventId, cardId, FirstWon)).to.be.reverted;
        await arenaAsAlice.takeCard(newCardId);
    });

    it("Allows to place regular+legendary cards", async () => {
        const cardAsAlice = card.connect(alice);
        const eventId = await createEvent(currentBlockTime + halfHour);
        const takeCards = async () => {
            const takeRegularCardTx = await arenaAsAlice.takeCard(cardId);
            await takeRegularCardTx.wait();
            const takeLegendaryCardTx = await arenaAsAlice.takeCard(legendaryCardIdBelongingToAlice);
            await takeLegendaryCardTx.wait();
        }

        await cardAsAlice.approve(arenaAsAlice.address, cardId)
        let makeRegularBetTx = await arenaAsAlice.makeBet(eventId, cardId, FirstWon);
        await makeRegularBetTx.wait();
        await cardAsAlice.approve(arenaAsAlice.address, legendaryCardIdBelongingToAlice);
        let makeLegendaryBetTx = await arenaAsAlice.makeBet(eventId, legendaryCardIdBelongingToAlice, SecondWon);
        await makeLegendaryBetTx.wait();
        
        await takeCards();
        
        
        await cardAsAlice.approve(arenaAsAlice.address, legendaryCardIdBelongingToAlice);
        makeLegendaryBetTx = await arenaAsAlice.makeBet(eventId, legendaryCardIdBelongingToAlice, SecondWon);
        await makeLegendaryBetTx.wait();
        await cardAsAlice.approve(arenaAsAlice.address, cardId);
        makeRegularBetTx = await arenaAsAlice.makeBet(eventId, cardId, FirstWon);
        await makeRegularBetTx.wait();

        await takeCards();
    });

    it("Lists all active bets", async () => {
        const cardAsAlice = card.connect(alice);

        // Sending
        let eventId = await createEvent(currentBlockTime + halfHour);
        await cardAsAlice.approve(arenaAsAlice.address, cardId);
        const makeFirstBetTx = await arenaAsAlice.makeBet(eventId, cardId, FirstWon);
        await makeFirstBetTx.wait();

        // Check!
        const activeBets = await arenaAsAlice.betsByAddressCount(alice.address);
        expect(activeBets).to.be.equal(1);
        const [[[betEventId, betChoice, betOwner]]] = await arenaAsAlice.betsByAddressAndIndex(alice.address, 0);
        expect(betEventId.valueOf()).to.be.equal(eventId.valueOf());
        expect(betChoice).to.be.equal(FirstWon);
        expect(betOwner).to.be.equal(alice.address);

        // Winning
        await ethers.provider.send('evm_increaseTime', [oneHour]);
        currentBlockTime = currentBlockTime + oneHour;
        await ethers.provider.send('evm_mine');
        const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
        await setFirstWonTx.wait();

        // Receiving
        let takeCardTx = await arenaAsAlice.takeCard(cardId);
        await takeCardTx.wait();
    });

    it("When you buy an epic card, you can mint it then", async () => {
        const newUser = ethers.Wallet.createRandom().connect(alice.provider);
        await alice.sendTransaction({to: newUser.address, value: "700000000000000000000"});
        const cardAsAlice = card.connect(alice)

        await card.setTokenPrice(BigNumber.from("2000000000"), Regular);
        await card.setTokenPrice(BigNumber.from("2000000000"), Rare);
        await card.setTokenPrice(BigNumber.from("2000000000"), Epic);
        
        const aliceMintedNewEpic = await cardAsAlice.mint(Epic, {value: "2000000000"});
        const effects = await aliceMintedNewEpic.wait();
        const mintedEpicTokenId = effects.events.filter(e => e.event === "Transfer")[0].args[2];
        expect(await card.getRarity(mintedEpicTokenId)).to.be.equal(2);
        await cardAsAlice.functions['safeTransferFrom(address,address,uint256)'](alice.address, newUser.address, mintedEpicTokenId);

        for (let rarity of [Regular, Rare, Epic]) {
            const mintTx = await card.connect(newUser).mint(rarity, {value: "2000000000"});
            await mintTx.wait();
        }
    });
})


describe("Auction tests", () => {
    let card, auction, maintoken;
    let admin, alice, bob, carl;

    let mintNewCard, placeCard, takeCard, placeBet;

    before(async () => {
        [admin, alice, bob, carl] = await ethers.getSigners();

        const Card = await ethers.getContractFactory("Card");
        const Maintoken = await ethers.getContractFactory("FreeToken");
        const Auction = await ethers.getContractFactory("Auction");

        card = await upgrades.deployProxy(Card);
        maintoken = await Maintoken.deploy();
        auction = await upgrades.deployProxy(Auction);

        await auction.setMaintokenAddress(maintoken.address);
        await maintoken.mint(alice.address, "10000000000000000000000000")
        await maintoken.mint(bob.address,   "10000000000000000000000000")
        await maintoken.mint(carl.address,   "10000000000000000000000000")

        const MINTER_ROLE = await card.MINTER_ROLE();
        const grantMinterRoleTx = await card.grantRole(MINTER_ROLE, admin.address);
        await grantMinterRoleTx.wait();

        const PRICE_MANAGER_ROLE = await card.PRICE_MANAGER_ROLE();
        const grantPriceManagerRoleTx = await card.grantRole(PRICE_MANAGER_ROLE, admin.address);
        await grantPriceManagerRoleTx.wait();

        const ARENA_CHANGER_ROLE = await card.ARENA_CHANGER_ROLE();
        const grantArenaChangerRoleTx = await card.grantRole(ARENA_CHANGER_ROLE, admin.address);
        await grantArenaChangerRoleTx.wait();

        const setAucInCardTx = await card.setAuctionAddress(auction.address);
        await setAucInCardTx.wait();

        const setCardAucTx = await auction.setCardAddress(card.address);
        await setCardAucTx.wait();

        const setAuctionFees = await auction.setCommission(5)
        await setAuctionFees.wait()

        await card.setTokenPrice(   "10000000000000000000", 0);
        await card.setTokenPrice(  "100000000000000000000", 1);
        await card.setTokenPrice( "1000000000000000000000", 2);
        await card.setTokenPrice("10000000000000000000000", 3);

        mintNewCard = async (to) => {
            const buyTx = await card.connect(to).mint(Regular, {value: "10000000000000000000"});
            const effects = await buyTx.wait();
            expect(effects.events.filter(e => e.event === "Transfer")).length.above(0);
            return effects.events.filter(e => e.event === "Transfer")[0].args[2];
        };

        placeCard = async (cardId, signer, minPrice = "0") => {
            const approveCardTx = await card.connect(signer).approve(auction.address, cardId);
            await approveCardTx.wait();
            const placeTx = await auction.connect(signer).placeCardToAuction(cardId, minPrice);
            await placeTx.wait();
        };

        placeBet = async (cardId, signer, price) => {
            const betTx = await auction.connect(signer).placeBet(cardId, price);
            await betTx.wait();
        };

        takeCard = async (cardId, signer) => {
            const takeTx = await auction.connect(signer).takeCard(cardId);
            await takeTx.wait();
        };
    });

    it("Bob can place card and take it if no bets in 48 hours", async () => {
        const cardId = await mintNewCard(bob);
        const cardOwner = await card.ownerOf(cardId);
        expect(cardOwner).to.be.equal(bob.address);

        await placeCard(cardId, bob);
        const cardOwnerAfterSendingToAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterSendingToAuc).to.be.equal(auction.address);

        // he can not take it immediately
        await expect(takeCard(cardId, bob)).to.be.revertedWith("TooEarly");

        await ethers.provider.send('evm_increaseTime', [48 * 3600 + 5]);
        await ethers.provider.send('evm_mine');

        // now he can
        await takeCard(cardId, bob)
        const cardOwnerAfterTakingFromAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterTakingFromAuc).to.be.equal(bob.address);

        // And can place it again
        await placeCard(cardId, bob);
        const cardOwnerAfterSendingToAucSecondTime = await card.ownerOf(cardId);
        expect(cardOwnerAfterSendingToAucSecondTime).to.be.equal(auction.address);
    });

    it("Alice can make a bet on Bobs card", async () => {
        const cardId = await mintNewCard(bob);
        await placeCard(cardId, bob, "100");

	await maintoken.connect(alice).approve(auction.address, 120)
	await maintoken.connect(carl).approve(auction.address, 125)

        await expect(placeBet(cardId, alice, "50")).to.be.revertedWith("TooFew");
        await placeBet(cardId, alice, "120");
        await expect(placeBet(cardId, carl, "115")).to.be.revertedWith("TooFew");
        await placeBet(cardId, carl, "125");

        // she cant take it immediately.
        await expect(takeCard(cardId, alice)).to.be.revertedWith("TooEarly");
        // bob cant take it back;
        await expect(takeCard(cardId, bob)).to.be.revertedWith("TooEarly");

        await ethers.provider.send('evm_increaseTime', [48 * 3600 + 5]);
        await ethers.provider.send('evm_mine');

        // even it bob tries to take it back, it is sent to carl
        const bobsBalanceBeforeTakingCard = await maintoken.balanceOf(bob.address)
        await takeCard(cardId, bob)
        const bobsBalanceAfterTakingCard = await maintoken.balanceOf(bob.address)
        expect(bobsBalanceAfterTakingCard.sub(bobsBalanceBeforeTakingCard).toString()).to.be.equal("118")
        const cardOwnerAfterTakingFromAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterTakingFromAuc).to.be.equal(carl.address);
    });
});
