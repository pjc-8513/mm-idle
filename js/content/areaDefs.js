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
    //nextArea: "mistyIslands",
    questId: "mistyIslands"
  }
  // more areas
};
