const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin: ", admin);

  const mainToken = getNamedAccount("mainToken")
  const cardProxy = getNamedAccount("cardProxy")
  const arenaProxy = getNamedAccount("arenaProxy")
  const auctionProxy = getNamedAccount("auctionProxy")
  const backend = getNamedAccount("backendAccount");
  const maticAuctionProxy = getNamedAccount("maticAuctionProxy")
  const tournamentProxy = "0x0"

  const CARD_DEPLOYED = true;
  const ARENA_DEPLOYED = true;
  const AUCTION_DEPLOYED = true;
  const MAINTOKEN_DEPOYED = true;
  const MAGICBOX_DEPLOYED = true;
  const MATIC_AUCTION_DEPLOYED = true;
  const TOURNAMENT_DEPLOYED = false;

  const Card = await ethers.getContractFactory("Card");
  const card = await (!CARD_DEPLOYED ? upgrades.deployProxy(Card) : Card.attach(cardProxy));
  await card.deployed();
  console.log("Card deployed to:", card.address);

  const Arena = await ethers.getContractFactory("Arena");
  const arena = await (!ARENA_DEPLOYED ? upgrades.deployProxy(Arena) : Arena.attach(arenaProxy).connect(admin));
  await arena.deployed();
  console.log("Arena deployed to:", arena.address);

  const MainToken = await ethers.getContractFactory("MainToken");
  const maintoken = await (!MAINTOKEN_DEPOYED ? upgrades.deployProxy(MainToken) : MainToken.attach(mainToken));
  await maintoken.deployed();
  console.log("MainToken deployed to:", maintoken.address);

  const Auction = await ethers.getContractFactory("MaintokenAuction");
  const auction = await (!AUCTION_DEPLOYED ? upgrades.deployProxy(Auction) : Auction.attach(auctionProxy));
  await auction.deployed();
  console.log("Auction deployed to:", auction.address);

  const MagicBox = await ethers.getContractFactory("MagicBox");
  const magicBox = await (!MAGICBOX_DEPLOYED ?
    MagicBox.deploy(getNamedAccount("vrfSubscriptionId"),
      getNamedAccount("vrfCoordinator"),
      400000,
      getNamedAccount("vrfKeyHash"),
      card.address) :
    MagicBox.attach(getNamedAccount("magicBox")));
  await magicBox.deployed();
  console.log("MagicBox deployed to:", magicBox.address);

  const MaticAuction = await ethers.getContractFactory("MaticAuction")
  const maticauction = await (!MATIC_AUCTION_DEPLOYED ? upgrades.deployProxy(MaticAuction) : MaticAuction.attach(maticAuctionProxy))
  await maticauction.deployed()
  console.log("MaticAuction deployed to:", maticauction.address);

  const Tournament = await ethers.getContractFactory("Tournament")
  const tournament = await (!TOURNAMENT_DEPLOYED ? upgrades.deployProxy(
    Tournament, [maintoken.address, card.address]
  ) : Tournament.attach(tournamentProxy))
  await tournament.deployed()
  console.log("Tournament deployed to:", tournament.address);
  /*

  const PRICE_MANAGER_ROLE = await card.PRICE_MANAGER_ROLE();
  const grantPriceManagerRoleTx = await card.grantRole(PRICE_MANAGER_ROLE, admin.address);
  await grantPriceManagerRoleTx.wait();

  const ARENA_CHANGER_ROLE = await card.ARENA_CHANGER_ROLE();
  const grantArenaChangerRoleTx = await card.grantRole(ARENA_CHANGER_ROLE, admin.address);
  await grantArenaChangerRoleTx.wait();

  const setArenaTx = await card.setArenaAddress(arena.address);
  await setArenaTx.wait();
  const setCardTx= await arena.setCardAddress(card.address);
  await setCardTx.wait();
  //const setTokenTx = await card.setAcceptedCurrency(freetoken.address);
  //await setTokenTx.wait();

  const minterAccount = await getNamedAccount("minterAccount");
  const MINTER_ROLE = await card.MINTER_ROLE();
  const grantMinterRoleTx = await card.grantRole(MINTER_ROLE, minterAccount);
  await grantMinterRoleTx.wait();

  const setMainTokenInArenaTx = await arena.setMainToken(maintoken.address);
  await setMainTokenInArenaTx.wait();
  const setMainTokenInCardTx = await card.setMainTokenAddress(maintoken.address);
  await setMainTokenInCardTx.wait();

  const changeOwnerTx = await arena.transferOwnership(minterAccount);
  await changeOwnerTx.wait();

  for (let i = 0; i <= 3; ++i) {
    const setPriceTx = await card.setTokenPrice(getNamedAccount(`tokenPrice${i}`), i);
    await setPriceTx.wait();

    const setUpgradePriceTx = await card.setTokenUpgradePrice(getNamedAccount(`tokenUpgradePrice${i}`), i);
    await setUpgradePriceTx.wait()
  }

  const setCardForAuctionTx = await auction.setCardAddress(card.address);
  await setCardForAuctionTx.wait()
  const setMaintokenAuctionTx = await auction.setMaintokenAddress(maintoken.address);
  await setMaintokenAuctionTx.wait();
  const setAuctionCommission = await auction.setCommission(5)
  await setAuctionCommission.wait()

  const MC_MINTER_ROLE = await maintoken.MINTER_ROLE()
  const setArenaAsMaincardMinterTx = await maintoken.grantRole(MC_MINTER_ROLE, arena.address)
  await setArenaAsMaincardMinterTx.wait()

  const setProbabilityTx = await magicBox.setProbability(0x03030302);
  await setProbabilityTx.wait()

  const grantMinterToMagicBox = await card.grantRole(MINTER_ROLE, magicBox.address);
  await grantMinterToMagicBox.wait()

  const WITHDRAWER_ROLE = await card.WITHDRAWER_ROLE();
  const grantWithdrawerTx = await card.grantRole(WITHDRAWER_ROLE, getNamedAccount("fundOwnerWallet"))
  await grantWithdrawerTx.wait()
  
  const setCardForMaticAuctionTx = await maticauction.setCardAddress(card.address);
  await setCardForMaticAuctionTx.wait()
  const setMaticAuctionCommission = await maticauction.setCommission(5)
  await setMaticAuctionCommission.wait()
  */

  const TOURNAMENT_MANAGER_ROLE = await tournament.TOURNAMENT_MANAGER_ROLE();
  const grantTournamentManagerRoleTx = await card.grantRole(TOURNAMENT_MANAGER_ROLE, backend);
  await grantTournamentManagerRoleTx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
