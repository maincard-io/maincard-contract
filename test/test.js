const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const Regular = 0;
const Rare = 1;
const Epic = 2;
const Legendary = 3;
const Mythic = 4;
const Demo = 5;

describe("Basic tests", function () {
  let instance, maintoken;
  let admin, alice, bob;
  let arenaAddress;
  let Card;

  before(async () => {
    [admin, alice, bob] = await ethers.getSigners();

    Card = await ethers.getContractFactory("Card");
    instance = await upgrades.deployProxy(Card);
    const MainToken = await ethers.getContractFactory("MainToken");
    maintoken = await upgrades.deployProxy(MainToken);
    arenaAddress = maintoken.address; // just to simplify testing

    const MINTER_ROLE = await instance.MINTER_ROLE();
    const grantMinterRoleTx = await instance.grantRole(
      MINTER_ROLE,
      alice.address,
    );
    await grantMinterRoleTx.wait();
    const PRICE_MANAGER_ROLE = await instance.PRICE_MANAGER_ROLE();
    const grantPriceManagerRoleTx = await instance.grantRole(
      PRICE_MANAGER_ROLE,
      bob.address,
    );
    await grantPriceManagerRoleTx.wait();

    const ARENA_CHANGER_ROLE = await instance.ARENA_CHANGER_ROLE();
    await instance.grantRole(ARENA_CHANGER_ROLE, admin.address);

    await instance.setControlAddresses(
      arenaAddress,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
    );
  });

  it("Bob Can set price", async () => {
    const contractAsBob = await instance.connect(bob);
    const setPriceTx = await contractAsBob.setTokenPrice(20, 0);
    await setPriceTx.wait();
  });

  it("Admin Can not set price", async () => {
    await expect(instance.setTokenPrice(20, 0)).to.be.revertedWithCustomError(
      Card,
      "MissingRequiredRole",
    );
  });

  it("Alice can mint free tokens", async () => {
    const contractAsAlice = await instance.connect(alice);
    const mintTx = await contractAsAlice.freeMint(alice.address, Regular);
    await mintTx.wait();
  });
  it("Bob can not mint free tokens", async () => {
    const contractAsBob = await instance.connect(bob);
    await expect(contractAsBob.freeMint(alice.address, Regular)).to.be.reverted;
  });

  it("Allows everyone to buy tokens if they provide money", async () => {
    const contractAsBob = await instance.connect(bob);
    const setPriceTx = await contractAsBob.setTokenPrice(
      BigNumber.from("20000000000000000000"),
      Regular,
    );
    const buyTx = await contractAsBob.mint(Regular, {
      value: "20000000000000000000",
    });
    const effects = await buyTx.wait();
    expect(effects.events.filter((e) => e.event === "Transfer")).length.above(
      0,
    );
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
    const mintedTokenId = mintEffects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    const balanceOfAliceAfter = await instance.balanceOf(alice.address);
    expect(balanceOfAliceAfter.sub(balanceOfAliceBefore).valueOf()).to.be.equal(
      1,
    );
    expect(
      await instance.tokenOfOwnerByIndex(
        alice.address,
        balanceOfAliceBefore /* because it is the index of the last one */,
      ),
    ).to.be.equal(mintedTokenId);
    const transferTx = await contractAsAlice.transferFrom(
      alice.address,
      admin.address,
      mintedTokenId,
    );
    await transferTx.wait();
    const tokenOwner = await contractAsAlice.ownerOf(mintedTokenId);
    expect(tokenOwner).to.be.equal(admin.address);
  });

  it("Does not allow to upgrade a Regular Card", async () => {
    const contractAsAlice = await instance.connect(alice);
    const mintTx = await contractAsAlice.freeMint(alice.address, Regular);
    const mintEffects = await mintTx.wait();
    const mintedTokenId1 = mintEffects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    const mintTx2 = await contractAsAlice.freeMint(alice.address, Regular);
    const mintEffects2 = await mintTx2.wait();
    const mintedTokenId2 = mintEffects2.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    await expect(contractAsAlice.upgrade(mintedTokenId1, mintedTokenId2)).to.be
      .reverted;
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
    const setPriceRegularTx = await contractAsBob.setTokenPrice(
      BigNumber.from("20000000000000000000"),
      Regular,
    );
    await setPriceRegularTx.wait();
    const setPriceRareTx = await contractAsBob.setTokenPrice(
      BigNumber.from("70000000000000000000"),
      Rare,
    );
    await setPriceRareTx.wait();
    const setPriceEpicTx = await contractAsBob.setTokenPrice(
      BigNumber.from("200000000000000000000"),
      Epic,
    );
    await setPriceEpicTx.wait();

    const newUser = ethers.Wallet.createRandom().connect(alice.provider);
    const fundUser = await alice.sendTransaction({
      to: newUser.address,
      value: "700000000000000000000",
    });

    for (let [rarity, px] of [
      [Regular, "20000000000000000000"],
      [Rare, "70000000000000000000"],
    ]) {
      const mintTx = await instance
        .connect(newUser)
        .mint(rarity, { value: px });
      await mintTx.wait();
    }
  });

  it("Does not allow to new user to mint Epic, Legendary, Mythic", async () => {
    const contractAsBob = await instance.connect(bob);
    const setPriceRegularTx = await contractAsBob.setTokenPrice(
      BigNumber.from("20000000000000000000"),
      Regular,
    );
    await setPriceRegularTx.wait();
    const setPriceRareTx = await contractAsBob.setTokenPrice(
      BigNumber.from("70000000000000000000"),
      Rare,
    );
    await setPriceRareTx.wait();
    const setPriceEpicTx = await contractAsBob.setTokenPrice(
      BigNumber.from("200000000000000000000"),
      Epic,
    );
    await setPriceEpicTx.wait();

    const newUser = ethers.Wallet.createRandom().connect(alice.provider);
    const fundUser = await alice.sendTransaction({
      to: newUser.address,
      value: "1000000000000000000",
    });
    await fundUser.wait();

    for (let rarity of [Epic, Legendary, Mythic]) {
      await expect(instance.connect(newUser).mint(rarity)).to.be.reverted;
    }
  });

  it("Allows to mint DEMO", async () => {
    const contractAsAlice = await instance.connect(alice);
    await contractAsAlice.freeMint(alice.address, Demo);
  });

  it("You can not send DEMO anywhere", async () => {
    const contractAsAlice = await instance.connect(alice);
    const mintTx = await contractAsAlice.freeMint(alice.address, Demo);
    const mintEffects = await mintTx.wait();
    const mintedTokenId1 = mintEffects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    await expect(
      contractAsAlice.transferFrom(alice.address, bob.address, mintedTokenId1),
    ).to.be.revertedWithCustomError(Card, "OperationNotPermittedForDemoCard");
  });

  it("You can send DEMO to Arena in 5 days", async () => {
    const contractAsAlice = await instance.connect(alice);
    const mintTx = await contractAsAlice.freeMint(alice.address, Demo);
    const mintEffects = await mintTx.wait();
    const mintedTokenId1 = mintEffects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    await ethers.provider.send("evm_increaseTime", [5 * 24 * 3600]);
    await ethers.provider.send("evm_mine");
    await contractAsAlice.transferFrom(
      alice.address,
      arenaAddress,
      mintedTokenId1,
    );
  });

  it("You can not send DEMO to Arena in 15 days", async () => {
    const contractAsAlice = await instance.connect(alice);
    const mintTx = await contractAsAlice.freeMint(alice.address, Demo);
    const mintEffects = await mintTx.wait();
    const mintedTokenId1 = mintEffects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    await ethers.provider.send("evm_increaseTime", [15 * 24 * 3600]);
    await ethers.provider.send("evm_mine");
    await expect(
      contractAsAlice.transferFrom(alice.address, arenaAddress, mintedTokenId1),
    ).to.be.revertedWithCustomError(Card, "OperationNotPermittedForDemoCard");
  });

  it("You can not burn DEMO in 5 days", async () => {
    const contractAsAlice = await instance.connect(alice);
    const mintTx = await contractAsAlice.freeMint(alice.address, Demo);
    const mintEffects = await mintTx.wait();
    const mintedTokenId1 = mintEffects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    await ethers.provider.send("evm_increaseTime", [5 * 24 * 3600]);
    await ethers.provider.send("evm_mine");
    await expect(
      contractAsAlice.burnCard(mintedTokenId1),
    ).to.be.revertedWithCustomError(Card, "CanNotBurnDemoYet");
  });

  it("You can burn DEMO in 15 days", async () => {
    const contractAsAlice = await instance.connect(alice);
    const mintTx = await contractAsAlice.freeMint(alice.address, Demo);
    const mintEffects = await mintTx.wait();
    const mintedTokenId1 = mintEffects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    await ethers.provider.send("evm_increaseTime", [15 * 24 * 3600]);
    await ethers.provider.send("evm_mine");
    await contractAsAlice.burnCard(mintedTokenId1);
  });
});

describe("Arena tests", () => {
  let lastEvent = 0;

  const FirstWon = 2;
  const SecondWon = 4;

  // block.timestamp = 1657490343 @ 7/10/2022 <- (new Date()).valueOf() / 1000
  let currentBlockTime;
  const halfHour = 1800;
  const oneHour = 3600;
  const twoDays = 2 * 24 * 3600;

  async function deployContracts() {
    const [admin, alice, bob] = await ethers.getSigners();

    const Card = await ethers.getContractFactory("Card");
    const card = await upgrades.deployProxy(Card);
    const Arena = await ethers.getContractFactory("Arena");
    const arena = await upgrades.deployProxy(Arena);
    const MainToken = await ethers.getContractFactory("MainToken");
    const maintoken = await upgrades.deployProxy(MainToken);

    const ARENA_CHANGER_ROLE = await card.ARENA_CHANGER_ROLE();
    await card.grantRole(ARENA_CHANGER_ROLE, admin.address);
    await card.setControlAddresses(
      arena.address,
      card.address,
      ethers.constants.AddressZero,
    );
    await arena.setCardAddress(card.address);

    const MINTER_ROLE = await card.MINTER_ROLE();
    await card.grantRole(MINTER_ROLE, admin.address);

    const PRICE_MANAGER_ROLE = await card.PRICE_MANAGER_ROLE();
    await card.grantRole(PRICE_MANAGER_ROLE, admin.address);

    const createEvent = async (betsUntil) => {
      lastEvent = lastEvent + 1;
      const createEventTx = await arena.createEvent(
        lastEvent,
        betsUntil,
        "0xff00000000000000000000000000000000000000000000000000000000000000",
      );
      await createEventTx.wait();
      return lastEvent;
    };

    const mintTx = await card.freeMint(alice.address, Regular);
    const mintEffects = await mintTx.wait();
    const cardId = mintEffects.events.filter((e) => e.event === "Transfer")[0]
      .args[2];

    const arenaAsAlice = arena.connect(alice);

    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    currentBlockTime = blockBefore.timestamp;

    const MT_MINTER_ROLE = await maintoken.MINTER_ROLE();
    const grantMinterRoleOfMainTokenToArena = await maintoken.grantRole(
      MT_MINTER_ROLE,
      arena.address,
    );
    await grantMinterRoleOfMainTokenToArena.wait();
    await arena.setMainToken(maintoken.address);
    await card.setControlAddresses(
      arena.address,
      maintoken.address,
      ethers.constants.AddressZero,
    );

    const makeBetAsAlice = async (eventId, cardId, choice) => {
      const makeBetMessage = ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["uint256", "uint256", "uint256", "uint8"],
            [
              await arenaAsAlice.gasFreeOpCounter(alice.address),
              eventId,
              cardId,
              choice,
            ],
          ),
        ),
      );
      const signatureInfo = ethers.utils.splitSignature(
        await alice.signMessage(makeBetMessage),
      );

      const tx = await arena.makeBetsGasFree(
        [eventId],
        [cardId],
        [choice],
        alice.address,
        signatureInfo.v,
        signatureInfo.r,
        signatureInfo.s,
      );
      await tx.wait();
    };

    const makeBetWithOddAsAlice = async (eventId, cardId, choice, odd) => {
      const makeBetMessage = ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["uint256", "uint256", "uint256", "uint8"],
            [
              await arenaAsAlice.gasFreeOpCounter(alice.address),
              eventId,
              cardId,
              choice,
            ],
          ),
        ),
      );
      const signatureInfo = ethers.utils.splitSignature(
        await alice.signMessage(makeBetMessage),
      );

      const tx = await arena.makeBetsWithOddGasFree(
        [eventId],
        [cardId],
        [choice],
        [odd],
        alice.address,
        signatureInfo.v,
        signatureInfo.r,
        signatureInfo.s,
      );
      await tx.wait();
    };

    const generateConsequentWins = async (cardId, count) => {
      for (let i = 0; i < count; ++i) {
        const eventId = await createEvent(currentBlockTime + halfHour);
        await makeBetAsAlice(eventId, cardId, FirstWon);
        await ethers.provider.send("evm_increaseTime", [oneHour]);
        currentBlockTime = currentBlockTime + oneHour;
        await ethers.provider.send("evm_mine");
        const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
        await setFirstWonTx.wait();
        let takeCardTx = await arenaAsAlice.takeCard(cardId);
        await takeCardTx.wait();
      }
    };

    const createEventMakeBetWinCycle = async (odd) => {
      const eventId = await createEvent(currentBlockTime + halfHour);
      await makeBetWithOddAsAlice(eventId, cardId, FirstWon, odd);
      await ethers.provider.send("evm_increaseTime", [oneHour]);
      currentBlockTime = currentBlockTime + oneHour;
      await ethers.provider.send("evm_mine");
      const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
      await setFirstWonTx.wait();
      let takeCardTx = await arenaAsAlice.takeCard(cardId);
      await takeCardTx.wait();
    };

    const ctx = {
      Card,
      admin,
      alice,
      bob,
      card,
      arena,
      maintoken,
      createEvent,
      cardId /* some card owned by alice */,
      arenaAsAlice,
      makeBetAsAlice,
      generateConsequentWins,
      createEventMakeBetWinCycle,
    };

    const legendaryCardIdBelongingToAlice = await getLegendaryCardForAlice(ctx);

    return { legendaryCardIdBelongingToAlice, ...ctx };
  }

  const getLegendaryCardForAlice = async (ctx) => {
    const { alice, card, arena, createEvent, arenaAsAlice, makeBetAsAlice } =
      ctx;
    const cardAsAlice = card.connect(alice);
    const setPriceTx = await card.setTokenPrice(
      BigNumber.from("20000000000000000000"),
      Regular,
    );
    await setPriceTx.wait();

    const regularCards = [];
    for (let i = 0; i < 2; ++i) {
      const mintTx = await cardAsAlice.mint(Regular, {
        value: "20000000000000000000",
      });
      const mintEffects = await mintTx.wait();
      regularCards.push(
        mintEffects.events.filter((e) => e.event === "Transfer")[0].args[2],
      );
    }
    for (const regularCardId of regularCards) {
      for (let roundNum = 0; roundNum < 3; ++roundNum) {
        // Sending
        let eventId = await createEvent(currentBlockTime + halfHour);
        const cardApproveTx = await cardAsAlice.approve(
          arenaAsAlice.address,
          regularCardId,
        );
        await cardApproveTx.wait();
        await makeBetAsAlice(eventId, regularCardId, FirstWon);
        // Winning
        await ethers.provider.send("evm_increaseTime", [oneHour]);
        currentBlockTime = currentBlockTime + oneHour;
        await ethers.provider.send("evm_mine");
        const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
        await setFirstWonTx.wait();
        // Receiving
        let takeCardTx = await arenaAsAlice.takeCard(regularCardId);
        await takeCardTx.wait();
      }
    }
    const setUpdatePriceTx = await card.setTokenUpgradePrice(
      BigNumber.from("200000000000000000000"),
      Regular,
    );
    await setUpdatePriceTx.wait();

    const rareCards = [];
    const upgradeToRareTx = await cardAsAlice.upgrade(...regularCards, {
      value: "200000000000000000000",
    });
    const upgrade1Effects = await upgradeToRareTx.wait();
    rareCards.push(
      upgrade1Effects.events.filter(
        (e) => e.event === "Transfer" && e.args[1] == alice.address,
      )[0].args[2],
    );

    const setRarePriceTx = await card.setTokenPrice(
      BigNumber.from("2000000000000000000000"),
      Rare,
    );
    await setRarePriceTx.wait();

    const mintRareTx = await cardAsAlice.mint(Rare, {
      value: "2000000000000000000000",
    });
    const mintRareEffects = await mintRareTx.wait();
    rareCards.push(
      mintRareEffects.events.filter(
        (e) => e.event === "Transfer" && e.args[1] == alice.address,
      )[0].args[2],
    );

    for (const rareCardId of rareCards) {
      for (let roundNum = 0; roundNum < 6; ++roundNum) {
        // Sending
        let eventId = await createEvent(currentBlockTime + halfHour);
        await cardAsAlice.approve(arenaAsAlice.address, rareCardId);
        await makeBetAsAlice(eventId, rareCardId, FirstWon);
        // Winning
        await ethers.provider.send("evm_increaseTime", [oneHour]);
        currentBlockTime = currentBlockTime + oneHour;
        await ethers.provider.send("evm_mine");
        const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
        await setFirstWonTx.wait();
        // Receiving
        let takeCardTx = await arenaAsAlice.takeCard(rareCardId);
        await takeCardTx.wait();
      }
    }

    const setUpdateToLegendaryPriceTx = await card.setTokenUpgradePrice(
      BigNumber.from("2000000000000000000000"),
      Rare,
    );
    await setUpdateToLegendaryPriceTx.wait();

    const upgradeToLegendaryTx = await cardAsAlice.upgrade(...rareCards, {
      value: "2000000000000000000000",
    });
    const upgrade2Effects = await upgradeToLegendaryTx.wait();
    return upgrade2Effects.events.filter(
      (e) => e.event === "Transfer" && e.args[1] == alice.address,
    )[0].args[2];
  };

  it("Sending, winning and receiving, sending, losing and receiving", async () => {
    const {
      alice,
      arena,
      admin,
      card,
      arenaAsAlice,
      cardId,
      maintoken,
      createEvent,
      makeBetAsAlice,
    } = await loadFixture(deployContracts);
    const cardAsAlice = card.connect(alice);

    // Sending
    let eventId = await createEvent(currentBlockTime + halfHour);
    await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
    await makeBetAsAlice(eventId, cardId, FirstWon);
    let cardOwner = await card.ownerOf(cardId);
    expect(cardOwner).to.be.equal(arena.address);
    // Alice is not controlling the card anymore.
    await expect(
      cardAsAlice.functions["safeTransferFrom(address,address,uint256)"](
        alice.address,
        admin.address,
        cardId,
      ),
    ).to.be.reverted;
    const cardIdRecorded = await arenaAsAlice.betsByUser(alice.address, 0);
    await expect(cardIdRecorded).to.be.equal(cardId);

    // Winning
    await ethers.provider.send("evm_increaseTime", [oneHour]);
    currentBlockTime = currentBlockTime + oneHour;
    await ethers.provider.send("evm_mine");
    const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
    await setFirstWonTx.wait();

    // Receiving
    const alicesMaintokenBalanceBefore = await maintoken.balanceOf(
      alice.address,
    );
    let takeCardTx = await arenaAsAlice.takeCard(cardId);
    await takeCardTx.wait();
    cardOwner = await card.ownerOf(cardId);
    expect(cardOwner).to.be.equal(alice.address);
    let wonCompetitions = await card.getLastConsequentWins(cardId);
    expect(wonCompetitions).to.be.equal(1);
    const alicesMaintokenBalanceAfter = await maintoken.balanceOf(
      alice.address,
    );
    expect(
      alicesMaintokenBalanceAfter.sub(alicesMaintokenBalanceBefore).toString(),
    ).to.be.equal("0");
    const livesRemaining = await card.livesRemaining(cardId);
    expect(livesRemaining).to.be.equal(2);

    // Sending
    eventId = await createEvent(currentBlockTime + halfHour);
    await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
    await makeBetAsAlice(eventId, cardId, SecondWon);

    // Losing
    await ethers.provider.send("evm_increaseTime", [oneHour]);
    currentBlockTime = currentBlockTime + oneHour;
    await ethers.provider.send("evm_mine");
    const setFirstWonTx2 = await arena.setEventResult(eventId, FirstWon);
    await setFirstWonTx2.wait();

    // Receiving
    const alicesMaintokenBalanceBeforeLosing = await maintoken.balanceOf(
      alice.address,
    );
    takeCardTx = await arenaAsAlice.takeCard(cardId);
    await takeCardTx.wait();
    wonCompetitions = await card.getLastConsequentWins(cardId);
    expect(wonCompetitions).to.be.equal(0);
    let statistics = await card.getBetsStatistics(cardId);
    expect(statistics).to.be.equal(2);
    const alicesMaintokenBalanceAfterLosing = await maintoken.balanceOf(
      alice.address,
    );
    expect(
      alicesMaintokenBalanceAfterLosing
        .sub(alicesMaintokenBalanceBeforeLosing)
        .toString(),
    ).to.be.equal("0");
    const livesRemainingAfterLosing = await card.livesRemaining(cardId);
    expect(livesRemainingAfterLosing).to.be.equal(1);

    // Sending
    eventId = await createEvent(currentBlockTime + twoDays + halfHour);
    await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
    // Sending within cooloff period.
    await expect(makeBetAsAlice(eventId, cardId, SecondWon)).to.be.reverted;
    await ethers.provider.send("evm_increaseTime", [twoDays]);
    currentBlockTime = currentBlockTime + twoDays;
    await ethers.provider.send("evm_mine");
    await makeBetAsAlice(eventId, cardId, SecondWon);

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
    await makeBetAsAlice(eventId, cardId, SecondWon);

    // Winning
    await ethers.provider.send("evm_increaseTime", [oneHour]);
    currentBlockTime = currentBlockTime + oneHour;
    await ethers.provider.send("evm_mine");
    let setResultTx = await arena.setEventResult(eventId, SecondWon);
    await setResultTx.wait();
    // Receiving
    const alicesMaintokenBalanceWinningWith1Life = await maintoken.balanceOf(
      alice.address,
    );
    takeCardTx = await arenaAsAlice.takeCard(cardId);
    await takeCardTx.wait();
    wonCompetitions = await card.getLastConsequentWins(cardId);
    expect(wonCompetitions).to.be.equal(1);
    statistics = await card.getBetsStatistics(cardId);
    expect(statistics).to.be.equal(5);
    const alicesMaintokenBalanceAfterWinningWith1Life =
      await maintoken.balanceOf(alice.address);
    expect(
      alicesMaintokenBalanceAfterWinningWith1Life
        .sub(alicesMaintokenBalanceWinningWith1Life)
        .toString(),
    ).to.be.equal("0");
    // Sending
    eventId = await createEvent(currentBlockTime + halfHour);
    await (await cardAsAlice.approve(arenaAsAlice.address, cardId)).wait();
    await makeBetAsAlice(eventId, cardId, SecondWon);

    // Winning
    await ethers.provider.send("evm_increaseTime", [oneHour]);
    currentBlockTime = currentBlockTime + oneHour;
    await ethers.provider.send("evm_mine");
    setResultTx = await arena.setEventResult(eventId, SecondWon);
    await setResultTx.wait();
    expect(await arenaAsAlice.betsByAddressCount(admin.address)).to.be.equal(0);
    expect(await arenaAsAlice.betsByAddressCount(alice.address)).to.be.equal(1);
    const [[[betEventId, betChoice, betOwner]]] =
      await arenaAsAlice.betsByAddressAndIndex(alice.address, 0);
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
    const { createEvent, arenaAsAlice } = await loadFixture(deployContracts);
    const eventId = await createEvent(currentBlockTime + halfHour);
    await expect(arenaAsAlice.setEventResult(eventId, FirstWon)).to.be.reverted;
  });

  it("Allows to place regular+legendary cards", async () => {
    const {
      alice,
      createEvent,
      cardId,
      card,
      arenaAsAlice,
      legendaryCardIdBelongingToAlice,
      makeBetAsAlice,
    } = await loadFixture(deployContracts);

    const cardAsAlice = card.connect(alice);
    const eventId = await createEvent(currentBlockTime + halfHour);
    const takeCards = async () => {
      const takeRegularCardTx = await arenaAsAlice.takeCard(cardId);
      await takeRegularCardTx.wait();
      const takeLegendaryCardTx = await arenaAsAlice.takeCard(
        legendaryCardIdBelongingToAlice,
      );
      await takeLegendaryCardTx.wait();
    };

    await cardAsAlice.approve(arenaAsAlice.address, cardId);
    await makeBetAsAlice(eventId, cardId, FirstWon);
    await cardAsAlice.approve(
      arenaAsAlice.address,
      legendaryCardIdBelongingToAlice,
    );
    await makeBetAsAlice(eventId, legendaryCardIdBelongingToAlice, SecondWon);

    await takeCards();

    await cardAsAlice.approve(
      arenaAsAlice.address,
      legendaryCardIdBelongingToAlice,
    );
    await makeBetAsAlice(eventId, legendaryCardIdBelongingToAlice, SecondWon);
    await cardAsAlice.approve(arenaAsAlice.address, cardId);
    await makeBetAsAlice(eventId, cardId, FirstWon);

    await takeCards();
  });

  it("Lists all active bets", async () => {
    const {
      arena,
      alice,
      card,
      arenaAsAlice,
      cardId,
      createEvent,
      makeBetAsAlice,
    } = await loadFixture(deployContracts);
    const cardAsAlice = card.connect(alice);

    // Sending
    let eventId = await createEvent(currentBlockTime + halfHour);
    await cardAsAlice.approve(arenaAsAlice.address, cardId);
    await makeBetAsAlice(eventId, cardId, FirstWon);

    // Check!
    const activeBets = await arenaAsAlice.betsByAddressCount(alice.address);
    expect(activeBets).to.be.equal(1);
    const [[[betEventId, betChoice, betOwner]]] =
      await arenaAsAlice.betsByAddressAndIndex(alice.address, 0);
    expect(betEventId.valueOf()).to.be.equal(eventId.valueOf());
    expect(betChoice).to.be.equal(FirstWon);
    expect(betOwner).to.be.equal(alice.address);

    // Winning
    await ethers.provider.send("evm_increaseTime", [oneHour]);
    currentBlockTime = currentBlockTime + oneHour;
    await ethers.provider.send("evm_mine");
    const setFirstWonTx = await arena.setEventResult(eventId, FirstWon);
    await setFirstWonTx.wait();

    // Receiving
    let takeCardTx = await arenaAsAlice.takeCard(cardId);
    await takeCardTx.wait();
  });

  it("When you buy an epic card, you can mint it then", async () => {
    const { alice, card } = await loadFixture(deployContracts);
    const newUser = ethers.Wallet.createRandom().connect(alice.provider);
    await alice.sendTransaction({
      to: newUser.address,
      value: "700000000000000000000",
    });
    const cardAsAlice = card.connect(alice);

    await card.setTokenPrice(BigNumber.from("2000000000"), Regular);
    await card.setTokenPrice(BigNumber.from("2000000000"), Rare);
    await card.setTokenPrice(BigNumber.from("2000000000"), Epic);

    const aliceMintedNewEpic = await cardAsAlice.mint(Epic, {
      value: "2000000000",
    });
    const effects = await aliceMintedNewEpic.wait();
    const mintedEpicTokenId = effects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    expect(await card.getRarity(mintedEpicTokenId)).to.be.equal(2);
    await cardAsAlice.functions["safeTransferFrom(address,address,uint256)"](
      alice.address,
      newUser.address,
      mintedEpicTokenId,
    );

    for (let rarity of [Regular, Rare, Epic]) {
      const mintTx = await card
        .connect(newUser)
        .mint(rarity, { value: "2000000000" });
      await mintTx.wait();
    }
  });

  it("Supports gasfree operations", async () => {
    const { card, arenaAsAlice, createEvent } =
      await loadFixture(deployContracts);
    const gaslessMan = ethers.Wallet.createRandom();

    const mintTx1 = await card.freeMint(gaslessMan.address, Regular);
    const mintEffects1 = await mintTx1.wait();
    const mintedTokenId1 = mintEffects1.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];
    const mintTx2 = await card.freeMint(gaslessMan.address, Regular);
    const mintEffects2 = await mintTx2.wait();
    const mintedTokenId2 = mintEffects2.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];

    const eventId = await createEvent(currentBlockTime + halfHour);
    expect(await card.ownerOf(mintedTokenId1)).to.be.eq(gaslessMan.address);
    expect(await card.ownerOf(mintedTokenId2)).to.be.eq(gaslessMan.address);

    // This is done on a frontend
    const makeBetMessage = ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.solidityPack(
          [
            "uint256",

            // add more items to this array if there are more cards
            "uint256",
            "uint256",
            "uint8",
            "uint256",
            "uint256",
            "uint8",
          ],
          [
            await arenaAsAlice.gasFreeOpCounter(gaslessMan.address),

            eventId,
            mintedTokenId1,
            FirstWon,
            eventId,
            mintedTokenId2,
            FirstWon,
          ],
        ),
      ),
    );
    const signatureInfo = ethers.utils.splitSignature(
      await gaslessMan.signMessage(makeBetMessage),
    );

    // then eventId, tokenId, choice, and signatureInfo is sent to backend
    // and placed by someone
    await arenaAsAlice.makeBetsGasFree(
      [eventId, eventId],
      [mintedTokenId1, mintedTokenId2],
      [FirstWon, FirstWon],
      gaslessMan.address,
      signatureInfo.v,
      signatureInfo.r,
      signatureInfo.s,
    );

    expect(await card.ownerOf(mintedTokenId1)).to.be.eq(arenaAsAlice.address);
    expect(await card.ownerOf(mintedTokenId2)).to.be.eq(arenaAsAlice.address);
  });

  it("Checks if list of call participations is updated", async () => {
    const { arena, card, arenaAsAlice, createEvent } =
      await loadFixture(deployContracts);

    const gaslessMan1 = ethers.Wallet.createRandom();
    const gaslessMan2 = ethers.Wallet.createRandom();

    const callIds = new Array(10).fill(0n).map((_) => BigNumber.from("0"));
    const eventIds = new Array(10).fill(0n).map((_) => BigNumber.from("0"));
    const cardIds1 = new Array(10).fill(0n).map((_) => BigNumber.from("0"));
    const cardIds2 = new Array(10).fill(0n).map((_) => BigNumber.from("0"));

    for (let i = 0; i < 10; ++i) {
      const eventId = await createEvent(currentBlockTime + halfHour);
      eventIds[i] = eventId;
      const mintTx1 = await card.freeMint(gaslessMan1.address, Regular);
      const mintEffects1 = await mintTx1.wait();
      const mintedTokenId1 = mintEffects1.events.filter(
        (e) => e.event === "Transfer",
      )[0].args[2];
      cardIds1[i] = mintedTokenId1;
      const mintTx2 = await card.freeMint(gaslessMan2.address, Regular);
      const mintEffects2 = await mintTx2.wait();
      const mintedTokenId2 = mintEffects2.events.filter(
        (e) => e.event === "Transfer",
      )[0].args[2];
      cardIds2[i] = mintedTokenId2;

      const sendCard1 = ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["uint256", "uint256", "uint256", "uint8"],
            [
              await arena.gasFreeOpCounter(gaslessMan1.address),
              eventId,
              mintedTokenId1,
              4,
            ],
          ),
        ),
      );

      const signature1Info = ethers.utils.splitSignature(
        await gaslessMan1.signMessage(sendCard1),
      );

      const tx = await arena.createCallGasFree(
        eventId,
        mintedTokenId1,
        /* outcome */ 4,
        gaslessMan1.address,
        /* odd */ 0,
        signature1Info.v,
        signature1Info.r,
        signature1Info.s,
      );
      const createCallEffects = await tx.wait();
      const callCreatedEvent = createCallEffects.events.filter(
        (e) => e.event === "NewCall",
      );
      expect(callCreatedEvent.length).to.be.eq(1);

      const callId = callCreatedEvent[0].args.callId;
      callIds[i] = callId.valueOf();

      const acceptByCard2 = ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["uint256", "uint256", "uint256", "uint8"],
            [
              await arena.gasFreeOpCounter(gaslessMan2.address),
              callId,
              mintedTokenId2,
              2,
            ],
          ),
        ),
      );

      const signature2Info = ethers.utils.splitSignature(
        await gaslessMan2.signMessage(acceptByCard2),
      );

      await arenaAsAlice.acceptCallGasFree(
        callId,
        mintedTokenId2,
        2,
        gaslessMan2.address,
        signature2Info.v,
        signature2Info.r,
        signature2Info.s,
      );

      expect(
        await arenaAsAlice.callsByAddressCount(gaslessMan1.address),
      ).to.be.equal(i + 1);
      expect(
        await arenaAsAlice.callsByAddressCount(gaslessMan2.address),
      ).to.be.equal(i + 1);

      // const man1Info = await arenaAsAlice.callsByAddressAndIndex(gaslessMan1.address, 0)
      // const man2Info = await arenaAsAlice.callsByAddressAndIndex(gaslessMan2.address, 0)

      const [u1_callIds, u1_eventIds, u1_choices, u1_results, u1_cardIds] =
        await arenaAsAlice.callsByAddressAndIndex(gaslessMan1.address, 0);
      const [u2_callIds, u2_eventIds, u2_choices, u2_results, u2_cardIds] =
        await arenaAsAlice.callsByAddressAndIndex(gaslessMan2.address, 0);

      expect(u1_callIds).to.be.deep.eq(callIds);
      expect(u2_callIds).to.be.deep.eq(callIds);
      expect(u1_cardIds).to.be.deep.eq(cardIds1);
      expect(u2_cardIds).to.be.deep.eq(cardIds2);
    }
  });

  it("Works as expected for Demo cards", async () => {
    const { alice, card, arena, arenaAsAlice, createEvent, makeBetAsAlice } =
      await loadFixture(deployContracts);
    const cardAsAlice = card.connect(alice);
    const mintTx = await card.freeMint(alice.address, Demo);
    const mintEffects = await mintTx.wait();
    const demoCardId = mintEffects.events.filter(
      (e) => e.event === "Transfer",
    )[0].args[2];

    // Sending
    let eventId = await createEvent(currentBlockTime + halfHour);
    await makeBetAsAlice(eventId, demoCardId, FirstWon);

    // Losing
    await ethers.provider.send("evm_increaseTime", [oneHour]);
    currentBlockTime = currentBlockTime + oneHour;
    await ethers.provider.send("evm_mine");
    await arena.setEventResult(eventId, SecondWon);

    // Receiving
    await arenaAsAlice.takeCard(demoCardId);
    const cardOwner = await card.ownerOf(demoCardId);
    expect(cardOwner).to.be.equal(alice.address);

    const livesRemaining = await card.livesRemaining(demoCardId);
    expect(livesRemaining).to.be.equal(1);

    // Restoring lives
    await cardAsAlice.restoreLiveMatic(demoCardId, {
      value: ethers.utils.parseEther("1.0"),
    });
    const livesRemainingAfterRestore = await card.livesRemaining(demoCardId);
  });

  it("should restore lives of a demo card successfully", async function() {
    const [owner, user] = await ethers.getSigners();

    // Deploy Card contract
    const Card = await ethers.getContractFactory("Card");
    const card = await Card.deploy();
    await card.deployed();

    // Assume freeMint function to mint a demo card for the user
    // Demo card ID is 0 for simplicity
    const demoCardId = 0;
    await card.connect(owner).freeMint(user.address, 5); // 5 corresponds to Demo

    // Mock the action that reduces lives (not part of this example)
    // ...

    // Prepare the message and sign it
    const nonce = await card.gasFreeOpCounter(user.address);
    const message = ethers.utils.solidityKeccak256(["uint256", "uint256"], [nonce, demoCardId]);
    const signature = await user.signMessage(ethers.utils.arrayify(message));

    // Split the signature to pass to the smart contract
    const { v, r, s } = ethers.utils.splitSignature(signature);

    // Call restoreLiveFree with the signed message
    await card.connect(owner).restoreLiveFree(demoCardId, user.address, v, r, s);

    // Check if lives have been restored
    const livesRemaining = await card.livesRemaining(demoCardId);
    expect(livesRemaining).to.equal(2); // Assuming 2 is the restored lives count
  });

  it("Test bets with coefficients", async () => {
    const { alice, card, maintoken, createEventMakeBetWinCycle } = await loadFixture(deployContracts);

    const odds = [105, 150, 450];
    const expectedMcnRewards = [
      "0",
      " 5 000'000'000 000'000'000".replace(/'/g, "").replace(/ /g, ""),  // 10 MCN * 0.5 
      "30 000'000'000 000'000'000".replace(/'/g, "").replace(/ /g, ""),  // 10 MCN * 3
    ];
    for (let i = 0; i < 3; ++i) {
      const mcnBalanceBefore = await maintoken.balanceOf(alice.address);
      await createEventMakeBetWinCycle(odds[i]);
      const mcnBalanceAfter = await maintoken.balanceOf(alice.address);
      expect(mcnBalanceAfter.sub(mcnBalanceBefore).toString()).to.be.equal(expectedMcnRewards[i]);
    }
  });

  it("Does not allow to merge cards from different partners", async () => {
    const { alice, card, Card, generateConsequentWins } =
      await loadFixture(deployContracts);

    const mint1Tx = await card.freeMint(alice.address, Regular);
    const mint1Effects = await mint1Tx.wait();
    const card1Id = mint1Effects.events.filter((e) => e.event === "Transfer")[0]
      .args[2];
    const mint2Tx = await card.freePartnersMint(alice.address, Regular, 1);
    const mint2Effects = await mint2Tx.wait();
    const card2Id = mint2Effects.events.filter((e) => e.event === "Transfer")[0]
      .args[2];
    const mint3Tx = await card.freePartnersMint(alice.address, Regular, 2);
    const mint3Effects = await mint3Tx.wait();
    const card3Id = mint3Effects.events.filter((e) => e.event === "Transfer")[0]
      .args[2];

    await generateConsequentWins(card1Id, 3);
    await generateConsequentWins(card2Id, 3);
    await generateConsequentWins(card3Id, 3);

    const cardAsAlice = card.connect(alice);

    await expect(
      cardAsAlice.upgrade(card3Id, card2Id, { value: "200000000000000000000" }),
    ).to.be.revertedWithCustomError(
      Card,
      "CardsFromDifferentPartnersNotMergeable",
    );

    const cardId1Partner = await cardAsAlice.partnerIDsForCard(card1Id);
    const cardId2Partner = await cardAsAlice.partnerIDsForCard(card2Id);
    expect(cardId1Partner).to.eq(0n);
    expect(cardId2Partner).to.eq(1n);
    const mergePartnerAndRegularTx = await cardAsAlice.upgrade(card1Id, card2Id, { value: "200000000000000000000" });
    const mergePartnerAndRegularEffects = await mergePartnerAndRegularTx.wait();
    const mergedPartnerAndRegularId = mergePartnerAndRegularEffects.events.filter(
      (e) => e.event === "Transfer" && e.args[0] == ethers.constants.AddressZero,
    )[0].args[2];
    const mergedPartnerAndRegularPartner = await cardAsAlice.partnerIDsForCard(mergedPartnerAndRegularId);
    expect(mergedPartnerAndRegularPartner).to.eq(
      1n, `Merged card should have the same partner ID as the partner card: ` + 
      `#${card1Id}|prt=${cardId1Partner} + #${card2Id}|prt=${cardId2Partner} = ` +
      `#${mergedPartnerAndRegularId}|prt=${mergedPartnerAndRegularPartner}`);
  });
});
