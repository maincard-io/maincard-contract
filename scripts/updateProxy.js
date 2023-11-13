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
  const Tournament = await ethers.getContractFactory("Tournament");

  const mainToken = getNamedAccount("mainToken")
  const cardProxy = getNamedAccount("cardProxy")
  const arenaProxy = getNamedAccount("arenaProxy")
  const auctionProxy = getNamedAccount("auctionProxy")
  const maticAuctionProxy = getNamedAccount("maticAuctionProxy")
  const tournamentProxy = getNamedAccount("tournamentProxy")

  // console.log("Updating card", cardProxy)
  // await upgrades.forceImport(cardProxy, Card)
  // await upgrades.upgradeProxy(cardProxy, Card, {gasLimit: 800000, }); console.log("Card upgraded, now run npx hardhat verify --contract contracts/Card.sol:Card --network polygon", cardProxy);
  
  // console.log("Updating arena", arenaProxy);
  // await upgrades.forceImport(arenaProxy, Arena)
  // await upgrades.upgradeProxy(arenaProxy, Arena, {gasLimit: 800000, unsafeSkipStorageCheck: true, redeployImplementation: 'always'}); console.log('Arena upgraded');
  // await upgrades.upgradeProxy(arenaProxy, Arena, {gasLimit: 800000 }); console.log('Arena upgraded, now run npx hardhat verify --contract contracts/Arena.sol:Arena --network polygon', arenaProxy);
  
  // console.log("Updating maintoken", mainToken);
  // await upgrades.upgradeProxy(mainToken, MainToken, {gasLimit: 800000}); console.log("maintoken updated");

  // console.log("Updating Auction", auctionProxy);
  // await upgrades.upgradeProxy(auctionProxy, Auction, {gasLimit: 800000}); console.log("Auction upgraded")
  
  // console.log("Updating Matic Auction", maticAuctionProxy);
  // await upgrades.upgradeProxy(maticAuctionProxy, MaticAuction, {gasLimit: 800000, unsafeSkipStorageCheck: true}); console.log("MaticAuction upgraded, now run npx hardhat verify --contract contracts/Auction.sol:MaticAuction --network polygon", maticAuctionProxy)
  // await upgrades.upgradeProxy(maticAuctionProxy, MaticAuction, {gasLimit: 800000}); console.log("MaticAuction upgraded, now run npx hardhat verify --contract contracts/Auction.sol:MaticAuction --network polygon", maticAuctionProxy)

  console.log("Updating tournament", tournamentProxy);
  await upgrades.upgradeProxy(tournamentProxy, Tournament, {gasLimit: 800000}); console.log("Tournament upgraded, now run npx hardhat verify --contract contracts/Tournament.sol:Tournament --network polygon", tournamentProxy)
  // await upgrades.upgradeProxy(tournamentProxy, Tournament, {gasLimit: 800000, unsafeSkipStorageCheck: true}); console.log("Tournament upgraded, now run npx hardhat verify --contract contracts/Tournament.sol:Tournament --network polygon", tournamentProxy)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
