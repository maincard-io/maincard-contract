// Here we are emulating named addresses from hardhat-deploy.

const DATA = {
    vrfCoordinator: {
      "mumbai": "0x7a1bac17ccc5b313516c5e16fb24f7659aa5ebed",
      "polygon": "0xae975071be8f8ee67addbc1a82488f1c24858067",
    },
    vrfKeyHash: {
      "mumbai": "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
      "polygon": "0xcc294a196eeeb44da2888d17c0625cc88d70d9760a69d58d853ba6581a9ab0cd",
    },
    vrfSubscriptionId: {
      "mumbai": 2861,
      "polygon": 526,
    },
    magicBox: {
      "mumbai": "0xdD5B3Fc8cc441dAce60eacC20261Cdd4e676140e",
      "polygon": "0xa545D7052a6472Ce97b6Be3ECb8Ea3B7c4950F03",
    },
    auctionProxy: {
      "mumbai": "0xE2A8C31727b29697b5f2309424C2d8ADE43C9dfe",
      "polygon": "0x36C729Ac4612F0CF156004D683Cf380936BC0953",
    },
    arenaProxy: {
      "mumbai": "0x69E91f33424a211A0B70e879169A0b2684ce2829",
      "polygon": "0x24c6f0C81Cc8E6fc9348Fb3ab5338F903A5B7959",
    },
    cardProxy: {
      "mumbai": "0x443DBEC6281bA4c2da1Ff49E6fD5ec28332b657B",
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
      "mumbai": "0x6f6F075D646336b9f59a4c7204bDaf75EaE266bE",
      "polygon": "0xB223211bF9Abb0AC8a604EE8946542eBc9972552",
    },

    tokenPrice0: {
      "polygon":    "10000000000000000000",
      "mumbai":        "10000000000000000",
    },
    tokenPrice1: {
      "polygon":   "100000000000000000000",
      "mumbai":        "20000000000000000",
    },
    tokenPrice2: {
      "polygon":  "1000000000000000000000",
      "mumbai":        "30000000000000000",
    },
    tokenPrice3: {
      "polygon": "10000000000000000000000",
      "mumbai":        "40000000000000000",
    },
    tokenUpgradePrice0: {
      "polygon":     "2000000000000000000",
      "mumbai":         "5000000000000000",
    },
    tokenUpgradePrice1: {
      "polygon":    "20000000000000000000",
      "mumbai":         "6000000000000000",
    },
    tokenUpgradePrice2: {
      "polygon":   "200000000000000000000",
      "mumbai":         "7000000000000000",
    },
    tokenUpgradePrice3: {
      "polygon":  "2000000000000000000000",
      "mumbai":         "8000000000000000",
    },
};

module.exports = (alias) => {
  return DATA[alias][hre.network.name] || DATA[alias]["default"]
}
