const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin: ", admin);

  const Card = await ethers.getContractFactory("Card");
  const MainToken = await ethers.getContractFactory("MainToken");
  const Arena = await ethers.getContractFactory("Arena");
  const Auction = await ethers.getContractFactory("MaintokenAuction");

  const mainToken = getNamedAccount("mainToken")
  const cardProxy = getNamedAccount("cardProxy")
  const arenaProxy = getNamedAccount("arenaProxy")
  const auctionProxy = getNamedAccount("auctionProxy")

 // await upgrades.upgradeProxy(cardProxy, Card, {gasLimit: 800000}); console.log('Card upgraded');
  await upgrades.upgradeProxy(arenaProxy, Arena, {gasLimit: 800000}); console.log('Arena upgraded');
  //await upgrades.upgradeProxy(mainToken, MainToken, {gasLimit: 800000});
  //await upgrades.upgradeProxy(auctionProxy, Auction, {gasLimit: 800000});
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
