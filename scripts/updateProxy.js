const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin: ", admin);

  const Card = await ethers.getContractFactory("Card");
  const MainToken = await ethers.getContractFactory("MainToken");
  const Arena = await ethers.getContractFactory("Arena");
  const Auction = await ethers.getContractFactory("Auction");
  const MaticAuction = await ethers.getContractFactory("MaticAuction");

  const mainToken = getNamedAccount("mainToken")
  const cardProxy = getNamedAccount("cardProxy")
  const arenaProxy = getNamedAccount("arenaProxy")
  const auctionProxy = getNamedAccount("auctionProxy")
  const maticAuctionProxy = getNamedAccount("maticAuctionProxy")

  // console.log("Updating card", cardProxy)
  // await upgrades.forceImport(cardProxy, Card)
  // await upgrades.upgradeProxy(cardProxy, Card, {gasLimit: 800000, }); console.log('Card upgraded');
  
  // console.log("Updating arena", arenaProxy);
  // await upgrades.forceImport(arenaProxy, Arena)
  // await upgrades.upgradeProxy(arenaProxy, Arena, {gasLimit: 800000, unsafeSkipStorageCheck: true, redeployImplementation: 'always'}); console.log('Arena upgraded');
  
  // console.log("Updating maintoken", mainToken);
  // await upgrades.upgradeProxy(mainToken, MainToken, {gasLimit: 800000}); console.log("maintoken updated");

  console.log("Updating Auction", auctionProxy);
  await upgrades.upgradeProxy(auctionProxy, Auction, {gasLimit: 800000}); console.log("Auction upgraded")
  
  // await upgrades.upgradeProxy(maticAuctionProxy, MaticAuction, {gasLimit: 800000}); console.log("MaticAuction upgraded")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
