// Here we are emulating named addresses from hardhat-deploy.

const DATA = {
    vrfCoordinator: {
      "polygon": "0xae975071be8f8ee67addbc1a82488f1c24858067",
    },
    vrfKeyHash: {
      "polygon": "0xcc294a196eeeb44da2888d17c0625cc88d70d9760a69d58d853ba6581a9ab0cd",
    },
    vrfSubscriptionId: {
      "polygon": 526,
    },
    magicBox: {
      "polygon": "0xdb0c6c6248d1efbb8a5040540089f3f47569c526",
    },
    auctionProxy: {
      "mumbai": "0x45222C36e7D17f1DEde37BB6D178eB7404D68e57",
      "polygon": "0x36C729Ac4612F0CF156004D683Cf380936BC0953",
    },
    arenaProxy: {
      "mumbai": "0xE1cE680A3112f4e5b8DBC97d8e6FF5b779F82524",
      "polygon": "0x24c6f0C81Cc8E6fc9348Fb3ab5338F903A5B7959",
    },
    cardProxy: {
      "mumbai": "0x5E14326aF84DA03e8B5468A17A47102C11801869",
      "polygon": "0x3D9e6bD43aC6afc78f3D8C8df6811D9aB53678c1",
    },
    minterAccount: {
      "mumbai": "0x98A3995FA46a386fd865EBa16544794E79889097",
      "polygon": "0x98A3995FA46a386fd865EBa16544794E79889097",
      "hardhat": "0x98A3995FA46a386fd865EBa16544794E79889097",
    },
    freeToken: {
      "mumbai": "0xe3e3a3C7a3d889f3281e53A7F8BC0296C2fCc781",
    },
    mainToken: {
      "mumbai": "0xda04e1b46B5bB177309c4E30Bff650C46CE83048",
      "polygon": "0xB223211bF9Abb0AC8a604EE8946542eBc9972552",
    },
};

module.exports = (alias) => {
  return DATA[alias][hre.network.name] || DATA[alias]["default"]
}
