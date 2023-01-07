const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin: ", admin);

  const Card = await ethers.getContractFactory("Card");
  const Arena = await ethers.getContractFactory("Arena");
  const Auction = await ethers.getContractFactory("Auction");
  const MagicBox = await ethers.getContractFactory("MagicBox");

  const cardProxy = getNamedAccount("cardProxy")
  const arenaProxy = getNamedAccount("arenaProxy")
  const auctionProxy = getNamedAccount("auctionProxy")
  const oldMagicBoxAddress = getNamedAccount("magicBox")

  // await upgrades.upgradeProxy(arenaProxy, Arena, {gasLimit: 800000});
  await upgrades.upgradeProxy(cardProxy, Card, {gasLimit: 800000});
  // await upgrades.upgradeProxy(auctionProxy, Auction, {gasLimit: 800000});
  return

  console.log("Stopping old magic box")
  const MINTER_ROLE = await Card.attach(cardProxy).MINTER_ROLE();
  const revokeMinterToMagicBox = await Card.attach(cardProxy).revokeRole(MINTER_ROLE, oldMagicBoxAddress);
  await revokeMinterToMagicBox.wait()
  
  console.log("Deploying new magic box")
  const magicBox = await MagicBox.deploy(getNamedAccount("vrfSubscriptionId"),
      getNamedAccount("vrfCoordinator"),
      400000,
      getNamedAccount("vrfKeyHash"),
      cardProxy)
  await magicBox.deployed()
  console.log(`New MagicBox deployed @ ${(await magicBox).address}`)
  const setProbabilityTx = await magicBox.setProbability(0x03030302);
  await setProbabilityTx.wait()
  
  const grantMinterToMagicBox = await Card.attach(cardProxy).grantRole(MINTER_ROLE, magicBox.address);
  await grantMinterToMagicBox.wait()
  
  console.log(`Setting commission`)
  const setAuctionCommission = await Auction.attach(auctionProxy).setCommission(5)
  await setAuctionCommission.wait()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
