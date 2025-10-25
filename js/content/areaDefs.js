export const AREA_TEMPLATES = {
  newSorpigal: {
    id: "newSorpigal",
    name: "New Sorpigal Outskirts",
    description: "The familiar countryside around New Sorpigal, perfect for beginning adventurers.",
    maxWaves: 10,
    //baseLevel: 1,
    enemies: ["dragonFly", "bandit", "apprenticeMage"],
    boss: "swarm", 
    //unlocks: ["mistyIslands", "goblinWatch"],
    nextArea: "mistyIslands",
    questId: "newSorpigal"
  },
  mistyIslands: {
    id: "mistyIslands",
    name: "Misty Islands",
    description: "The familiar countryside around New Sorpigal, perfect for beginning adventurers.",
    maxWaves: 10,
    //baseLevel: 1,
    enemies: ["goblin", "bandit", "apprenticeMage", "skeletonArcher"],
    boss: "goblinKing", 
    //unlocks: ["mistyIslands", "goblinWatch"],
    nextArea: "bootlegBay",
    questId: "mistyIslands"
  },
    bootlegBay: {
      id: "bootlegBay",
      name: "Bootleg Bay",
      description: "The islands of Bootleg Bay hide a pile of pirate treasure. That is, if you can get past the cannibals and actually find it.",
      maxWaves: 10,
      //baseLevel: 1,
      enemies: ["pirateRaider", "headHunter", "dustDevil", "giantRat"],
      boss: "seaTerror", 
      //unlocks: ["mistyIslands", "goblinWatch"],
      nextArea: "castleIronfist",
      questId: "bootlegBay"
  },
    castleIronfist: {
      id: "castleIronfist",
      name: "Castle Ironfist",
      description: "Ordinarily, we only have one group of bandits preying upon travelers. but these days we have not one, not two, but THREE groups of bandits!",
      maxWaves: 10,
      //baseLevel: 1,
      enemies: ["goblin", "lich", "masterArcher", "bandit", "cobra"],
      boss: "masterThief", 
      //unlocks: ["mistyIslands", "goblinWatch"],
      //nextArea: "mistyIslands",
      questId: "castleIronfist"
  },
  // more areas
};
