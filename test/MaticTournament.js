const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TournamentMatic", function () {
  async function deployContracts() {
    const [owner, alice, bob, charlie, manager] = await ethers.getSigners();

    const Card = await ethers.getContractFactory("Card");
    const card = await upgrades.deployProxy(Card);

    const TournamentMatic = await ethers.getContractFactory("TournamentMatic");
    const instance = await upgrades.deployProxy(TournamentMatic, [
      card.address,
    ]);

    const MINTER_ROLE = await card.MINTER_ROLE();
    await card.grantRole(MINTER_ROLE, owner.address);

    const createCard = async (rarity) => {
      const createCardTx = await card.freeMint(alice.address, 0);
      const createCardTxReceipt = await createCardTx.wait();
      const transferEventsForCreateTx = createCardTxReceipt.events.filter(
        (e) => e.event === "Transfer",
      );
      expect(transferEventsForCreateTx).to.have.length(1);
      const transferEventForCreateTx = transferEventsForCreateTx[0];
      return transferEventForCreateTx.args[2];
    };

    const cardBasic1Id = await createCard(0);
    const cardBasic2Id = await createCard(0);
    const cardUncommon1Id = await createCard(1);
    const cardUncommon2Id = await createCard(1);

    const TOURNAMENT_MANAGER_ROLE = await instance.TOURNAMENT_MANAGER_ROLE();
    await instance.grantRole(TOURNAMENT_MANAGER_ROLE, manager.address);

    const createTournament = async (
      tournamentId,
      fee,
      minRequiredRarity,
      requiredCardsAmount,
    ) => {
      await instance
        .connect(manager)
        .setTournamentRules(
          tournamentId,
          fee,
          minRequiredRarity,
          requiredCardsAmount,
        );
    };

    const participate = async (tournamentId, cardIds, value) => {
      await instance
        .connect(alice)
        .registerForTournament(cardIds, tournamentId, { value });
    };

    const payout = async (tournamentId, winners, amounts) => {
      await instance
        .connect(manager)
        .completeTournament(tournamentId, winners, amounts);
    };

    return {
      instance,
      card,
      cardBasic1Id,
      cardBasic2Id,
      owner,
      alice,
      bob,
      charlie,
      cardUncommon1Id,
      cardUncommon2Id,
      createTournament,
      participate,
      payout,
    };
  }

  it("Should be deployable", async () => {
    const { instance } = await loadFixture(deployContracts);
  });

  it("Should allow to create a tournament", async () => {
    const { createTournament } = await loadFixture(deployContracts);
    await createTournament(0, 100, 0, 1);
  });

  it("Should not allow to create a tournament to wrong person", async () => {
    const { instance, bob } = await loadFixture(deployContracts);
    await expect(
      instance.connect(bob).setTournamentRules(1, 100, 0, 1),
    ).to.be.revertedWith(
      "msg.sender should have granted TOURNAMENT_MANAGER_ROLE",
    );
  });

  it("Should not allow to participate in a tournament if not enough cards, not enough value", async () => {
    const { createTournament, participate, cardBasic1Id, cardBasic2Id } =
      await loadFixture(deployContracts);
    await createTournament(2, "1000000000000000000", 0, 2);

    await expect(
      participate(2, [cardBasic1Id], "1000000000000000000"),
    ).to.be.revertedWith("Tournament: wrong cards amount");
    await expect(
      participate(2, [cardBasic1Id, cardBasic2Id], "500000000000000000"),
    ).to.be.revertedWith("Tournament: wrong fee");
    await participate(2, [cardBasic1Id, cardBasic2Id], "1000000000000000000");
  });

  it("Does not allow to participate in a tournament if not enough cards of required rarity", async () => {
    const { createTournament, participate, cardBasic1Id, cardBasic2Id } =
      await loadFixture(deployContracts);

    await createTournament(3, "1000000000000000000", 1, 2);
    await expect(
      participate(3, [cardBasic1Id, cardBasic2Id], "1000000000000000000"),
    ).to.be.revertedWith("Tournament: wrong rarity");
  });

  it("Does allow to participate if rarity is higher", async () => {
    const { createTournament, participate, cardUncommon2Id, cardUncommon1Id } =
      await loadFixture(deployContracts);

    await createTournament(4, "1000000000000000000", 0, 1);
    await participate(4, [cardUncommon1Id], "1000000000000000000");
  });

  it("Does not allow to participate to more cards", async () => {
    const { createTournament, participate, cardUncommon2Id, cardUncommon1Id } =
      await loadFixture(deployContracts);

    await createTournament(5, "1000000000000000000", 0, 1);
    await expect(
      participate(5, [cardUncommon1Id, cardUncommon2Id], "1000000000000000000"),
    ).to.be.revertedWith("Tournament: wrong cards amount");
  });

  it("Does not allow to participate to the same card twice", async () => {
    const { createTournament, participate, cardUncommon2Id } =
      await loadFixture(deployContracts);

    await createTournament(6, "1000000000000000000", 0, 2);
    await expect(
      participate(6, [cardUncommon2Id, cardUncommon2Id], "1000000000000000000"),
    ).to.be.revertedWith("Tournament: duplicate cards");
  });

  it("Allow to participate to the same card twice", async () => {
    // Controversial test, but it's how it works now.
    const { createTournament, participate, cardUncommon1Id } =
      await loadFixture(deployContracts);

    await createTournament(7, "1000000000000000000", 0, 1);
    await participate(7, [cardUncommon1Id], "1000000000000000000");
    await participate(7, [cardUncommon1Id], "1000000000000000000");
  });

  it("Allow to give winner less on tournament end", async () => {
    const { createTournament, participate, payout, alice, cardBasic1Id } =
      await loadFixture(deployContracts);

    await createTournament(8, "1000000000000000000", 0, 1);
    await participate(8, [cardBasic1Id], "1000000000000000000");
    const balanceBefore = await alice.getBalance();
    await payout(8, [alice.address], ["500000000000000000"]);
    const balanceAfter = await alice.getBalance();
    expect(balanceAfter.sub(balanceBefore)).to.be.equal("500000000000000000");
  });

  it("Does not allow to give winner more on tournament end", async () => {
    const {
      createTournament,
      participate,
      payout,
      alice,
      cardBasic1Id,
      instance,
    } = await loadFixture(deployContracts);

    await createTournament(9, "1000000000000000000", 0, 1);
    await participate(9, [cardBasic1Id], "1000000000000000000");
    const contractBalanceBefore = await ethers.provider.getBalance(
      instance.address,
    );
    await expect(
      payout(9, [alice.address], ["1500000000000000000"]),
    ).to.be.revertedWith("Tournament: insufficient balance");
    const contractBalanceAfter = await ethers.provider.getBalance(
      instance.address,
    );
    expect(contractBalanceAfter).to.be.equal(contractBalanceBefore);
  });

  it("Does not allow to give to someone else on tournament end", async () => {
    const {
      createTournament,
      participate,
      payout,
      instance,
      bob,
      cardBasic1Id,
    } = await loadFixture(deployContracts);

    await createTournament(10, "1000000000000000000", 0, 1);
    await participate(10, [cardBasic1Id], "1000000000000000000");
    const contractBalanceBefore = await ethers.provider.getBalance(
      instance.address,
    );
    await expect(
      payout(10, [bob.address], ["500000000000000000"]),
    ).to.be.revertedWith("Tournament: winner is not registered");
    const contractBalanceAfter = await ethers.provider.getBalance(
      instance.address,
    );
    expect(contractBalanceAfter).to.be.equal(contractBalanceBefore);
  });
});
