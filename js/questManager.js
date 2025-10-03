// questManager.js
import { state } from './state.js';
import { ENEMY_TEMPLATES } from './content/enemyDefs.js';
import { emit, on } from './events.js';
import { prefixes } from './content/definitions.js';
import { logMessage } from './systems/log.js';
import { uiAnimations } from './systems/animations.js';

// Quest configuration
const QUEST_CONFIG = {
  defeat_prefix: {
    enemiesRequired: 5,
    baseExpReward: 100,
    expPerLevel: 20
  },
  defeat_type: {
    enemiesRequired: 10,
    baseExpReward: 200,
    expPerLevel: 50
  }
};

/**
 * Initialize quest system
 * Call this once when game loads
 */
export function initQuestSystem() {
  // Add quest state if not exists
  if (!state.quests) {
    state.quests = {
      prefixQuests: {}, // Key: prefix name, Value: quest object
      typeQuests: {} // key: type name, value: quest object
    };
  }

  // Generate initial quests for unlocked prefixes
  generateTypeQuests();
  generatePrefixQuests();
  

  // Listen for enemy defeats
  on('enemyDefeated', handleEnemyDefeated);

  // Listen for hero level ups to unlock new prefix quests
  on('heroLevelUp', handleHeroLevelUp);

  // Set up UI
  setupQuestUI();
}

function generateQuests({ questType, sourceList, keyExtractor, questStoreKey, createQuestFn }) {
  sourceList.forEach(item => {
    const key = keyExtractor(item);
    if (!state.quests[questStoreKey][key]) {
      state.quests[questStoreKey][key] = createQuestFn(key);
    }
  });

  emit('questsUpdated');
  if (isPanelActive('panelQuest')) {
    renderQuestPanel();
  }
}

function generatePrefixQuests() {
  const unlockedPrefixes = prefixes.filter(p => state.heroLevel >= p.unlocks);
  generateQuests({
    questType: 'defeat_prefix',
    sourceList: unlockedPrefixes,
    keyExtractor: p => p.prefix,
    questStoreKey: 'prefixQuests',
    createQuestFn: createPrefixQuest
  });
}

function generateTypeQuests() {
  const enemyTypes = [...new Set(Object.values(ENEMY_TEMPLATES).map(e => e.type))];
  generateQuests({
    questType: 'defeat_type',
    sourceList: enemyTypes,
    keyExtractor: t => t,
    questStoreKey: 'typeQuests',
    createQuestFn: createTypeQuest
  });
}


function createQuest({ idPrefix, questType, key, configKey }) {
  const config = QUEST_CONFIG[configKey];
  console.log(config);
  return {
    id: `${idPrefix}_${key}_${Date.now()}`,
    type: questType,
    [questType === 'defeat_prefix' ? 'prefix' : 'enemyType']: key,
    targetCount: config.enemiesRequired,
    currentCount: 0,
    expReward: config.baseExpReward + (state.heroLevel * config.expPerLevel),
    isComplete: false
  };
}

function createPrefixQuest(prefix) {
  return createQuest({
    idPrefix: 'prefix',
    questType: 'defeat_prefix',
    key: prefix,
    configKey: 'defeat_prefix' // ✅ must match QUEST_CONFIG key
  });
}

function createTypeQuest(type) {
  return createQuest({
    idPrefix: 'type',
    questType: 'defeat_type',
    key: type,
    configKey: 'defeat_type' // ✅ must match QUEST_CONFIG key
  });
}



/**
 * Handle enemy defeated event
 */
function handleEnemyDefeated({ enemy }) {
  const questTypes = [
    { store: 'prefixQuests', key: enemy.prefix, type: 'defeat_prefix' },
    { store: 'typeQuests', key: enemy.type, type: 'defeat_type' }
  ];
  console.log(enemy);
  questTypes.forEach(({ store, key, type }) => {
    const quest = state.quests[store]?.[key];
    if (quest && !quest.isComplete) {
      quest.currentCount++;
      console.log(enemy);
      if (quest.currentCount >= quest.targetCount) {
        quest.isComplete = true;
        emit('questCompleted', quest);
        flashSidePanel(quest);
      }

      emit('questProgressUpdated', quest);

      if (isPanelActive('panelQuest')) {
        console.log(enemy);
        updateQuestCard(key, store); // ✅ Pass both key and store
      }
    }
  });
}



/**
 * Handle hero level up - unlock new prefix quests
 */
function handleHeroLevelUp() {
  console.log("[handleHeroLevelUp] Hero leveled up → regenerating quests...");

  // Regenerate prefix quests
  generateQuests({
    questType: 'defeat_prefix',
    sourceList: state.availablePrefixes || [],
    keyExtractor: prefix => prefix, // or prefix.name if it's an object
    questStoreKey: 'prefixQuests',
    createQuestFn: createPrefixQuest
  });

  // Regenerate type quests
  generateQuests({
    questType: 'defeat_type',
    sourceList: state.availableTypes || [],
    keyExtractor: type => type, // adjust if your data is objects
    questStoreKey: 'typeQuests',
    createQuestFn: createTypeQuest
  });
}


/**
 * Complete a specific quest and grant rewards
 * @param {string} questCategory - The key in state.quests (e.g., 'prefixQuests', 'typeQuests')
 * @param {string} questKey - The identifier for the specific quest (e.g., prefix name or type name)
 * @param {Function} createQuestFn - Function to create a new quest of this type
 */
export function completeQuestGeneric(questCategory, questKey, createQuestFn) {
  const questStore = state.quests[questCategory];
  const oldQuest = questStore?.[questKey];

  if (!oldQuest || !oldQuest.isComplete) {
    console.warn(`Cannot complete quest for ${questCategory}: ${questKey}`);
    return;
  }

  console.log("[COMPLETE QUEST] Starting turn-in:", questCategory, questKey, oldQuest);

  const prevLevel = state.heroLevel;

  // Grant rewards
  addHeroExp(oldQuest.expReward);
  console.log("[COMPLETE QUEST] After EXP:", { heroLevel: state.heroLevel, heroExp: state.heroExp });

  // Replace quest with a fresh one
  const newQuest = createQuestFn(questKey);
  questStore[questKey] = newQuest;
  console.log("[COMPLETE QUEST] New quest created:", newQuest);

  emit('questTurnedIn', {
    questType: oldQuest.type,
    key: questKey,
    expGained: oldQuest.expReward,
    leveledUp: state.heroLevel > prevLevel
  });

  // Refresh UI
  if (isPanelActive('panelQuest')) {
    //fullRenderQuestPanel();
    updateQuestPanel();
  }

  // Check if any *other* quests are still complete
  const hasActiveQuests = Object.values(questStore).some(q => q.isComplete);
  console.log("[COMPLETE QUEST] Active quests left?", hasActiveQuests, questStore);

  if (!hasActiveQuests) {
    const panelQuestButton = document.getElementById('panelQuestButton');
    panelQuestButton?.classList.remove('quest-complete');
  }
}




/**
 * Add experience to hero and handle leveling
 */
function addHeroExp(amount) {
  const oldLevel = state.heroLevel;
  state.heroExp += amount;

  // Calculate exp needed for next level
  let expNeeded = getExpForLevel(state.heroLevel + 1);

  // Handle level ups (can be multiple levels)
  while (state.heroExp >= expNeeded) {
    levelUpHero();
    expNeeded = getExpForLevel(state.heroLevel + 1);
  }

  console.log("[EXP] Final hero state:", { 
    level: state.heroLevel, 
    exp: state.heroExp, 
    nextNeeded: getExpForLevel(state.heroLevel + 1) 
  });

  updateQuestPanel();
  if (state.heroLevel > oldLevel) {
    emit('heroExpChanged', {
      exp: state.heroExp,
      oldLevel,
      newLevel: state.heroLevel
    });
  }
}

/**
 * Calculate experience needed for a given level
 * Using formula: level^2 * 100
 */
function getExpForLevel(level) {
  return Math.pow(level, 2) * 100;
}

/**
 * Level up the hero
 */
function levelUpHero() {
  const expNeeded = getExpForLevel(state.heroLevel + 1);
  state.heroExp -= expNeeded;  // expNeeded is correct here (requirement for NEXT level)
  state.heroLevel++;

  // But safeguard: don’t let exp go negative
  if (state.heroExp < 0) state.heroExp = 0;

  // Apply stat gains
  if (state.heroGains) {
    for (const [stat, value] of Object.entries(state.heroGains)) {
      if (state.heroStats[stat] !== undefined) {
        state.heroStats[stat] += value;
      }
    }
  }

  uiAnimations.triggerHeroLevelUp();

  emit('heroLevelUp', {
    level: state.heroLevel,
    gains: state.heroGains
  });
}


/**
 * Set up quest UI elements
 */
function setupQuestUI() {
  const questButton = document.querySelector('[data-panel="quest"]');
  if (questButton) {
    questButton.addEventListener('click', renderQuestPanel);
  }

  // Initial render if panel exists
  renderQuestPanel();
}

/**
 * Main render function for quest panel
 */
export function renderQuestPanel() {
  const panel = document.getElementById("panelQuest");
  if (!panel) return;

  // Only do full render if this is the first time or panel is empty
  if (!panel.querySelector('.questGrid')) {
    fullRenderQuestPanel();
  } else {
    updateQuestPanel();
  }
}

/**
 * Full render of quest panel (called once or when structure changes)
 */
function fullRenderQuestPanel() {
  const panel = document.getElementById("panelQuest");

  panel.innerHTML = `
    <div class="quest-panel-header">
      <h2>Quests</h2>
      <div class="quest-hero-info">
        <div class="hero-level">Hero Level: <span id="heroLevel">${state.heroLevel}</span></div>
        <div class="hero-exp">
          Experience: <span id="heroExp">${Math.floor(state.heroExp)}</span> / 
          <span id="heroExpNeeded">${getExpForLevel(state.heroLevel + 1)}</span>
        </div>
      </div>
    </div>
  `;

  const container = document.createElement("div");
  container.classList.add("questGrid");

  const questTypes = [
    { key: 'prefixQuests', label: 'Prefix' },
    { key: 'typeQuests', label: 'Type' }
    // Add more types here as needed
  ];

  let totalQuests = 0;

  questTypes.forEach(({ key, label }) => {
    const quests = state.quests[key] || {};
    const entries = Object.entries(quests);

    entries.forEach(([questKey, quest]) => {
      const questCard = createQuestCard(questKey, quest, key);
      container.appendChild(questCard);
      totalQuests++;
    });
  });

  if (totalQuests === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.classList.add("quest-empty-message");
    emptyMessage.textContent = "No quests available yet. Keep playing to unlock more!";
    container.appendChild(emptyMessage);
  }

  panel.appendChild(container);
  updateQuestPanel();
}


/**
 * Create a quest card element
 */
function createQuestCard(questKey, quest, questStoreKey) {
  const questCard = document.createElement("div");
  questCard.classList.add("questCard");
  questCard.dataset.questKey = questKey;
  questCard.dataset.questType = quest.type;

  const iconText = document.createElement("div");
  iconText.classList.add("quest-icon");
  iconText.textContent = questKey.charAt(0).toUpperCase();

  const infoOverlay = document.createElement("div");
  infoOverlay.classList.add("questInfo");

  const titleDiv = document.createElement("div");
  titleDiv.classList.add("questTitle");
  titleDiv.textContent = `${questKey} ${quest.type === 'defeat_prefix' ? 'Slayer' : 'Hunter'}`;

  const descDiv = document.createElement("div");
  descDiv.classList.add("questDesc");
  descDiv.textContent = `Defeat ${quest.targetCount} ${questKey} enemies`;

  const progressDiv = document.createElement("div");
  progressDiv.classList.add("questProgress");
  progressDiv.textContent = `Progress: ${quest.currentCount} / ${quest.targetCount}`;

  const rewardDiv = document.createElement("div");
  rewardDiv.classList.add("questReward");
  rewardDiv.textContent = `Reward: ${quest.expReward} EXP`;

  infoOverlay.appendChild(titleDiv);
  infoOverlay.appendChild(descDiv);
  infoOverlay.appendChild(progressDiv);
  infoOverlay.appendChild(rewardDiv);

  const btn = document.createElement("button");
  btn.classList.add("completeQuestBtn");
  btn.dataset.questKey = questKey;
  btn.dataset.questStoreKey = questStoreKey;

  const btnText = document.createElement("span");
  btnText.textContent = "Complete";
  btn.appendChild(btnText);

  updateQuestButton(btn, quest);

  btn.addEventListener("click", () => {
    const liveQuest = state.quests[questStoreKey]?.[questKey];
    if (liveQuest && liveQuest.isComplete) {
      const createFn = liveQuest.type === 'defeat_prefix' ? createPrefixQuest : createTypeQuest;
      completeQuestGeneric(questStoreKey, questKey, createFn);
    }
  });



  questCard.appendChild(infoOverlay);
  questCard.appendChild(btn);

  return questCard;
}


/**
 * Update all quest cards (efficient update)
 */
function updateQuestPanel() {
  // Update hero info
  const heroLevelEl = document.getElementById('heroLevel');
  const heroExpEl = document.getElementById('heroExp');
  const heroExpNeededEl = document.getElementById('heroExpNeeded');

  if (heroLevelEl) heroLevelEl.textContent = state.heroLevel;
  if (heroExpEl) heroExpEl.textContent = Math.floor(state.heroExp);
  if (heroExpNeededEl) heroExpNeededEl.textContent = getExpForLevel(state.heroLevel + 1);

  // Update all quest cards across all quest types
  const questTypes = ['prefixQuests', 'typeQuests']; // Add more keys here as needed

  questTypes.forEach(storeKey => {
    const quests = state.quests[storeKey] || {};
    Object.keys(quests).forEach(questKey => {
      updateQuestCard(questKey, storeKey);
    });
  });
}


/**
 * Update a specific quest card
 */
function updateQuestCard(questKey, questStoreKey) {
  const quest = state.quests[questStoreKey]?.[questKey];
  if (!quest) return;

  const card = document.querySelector(`.questCard[data-quest-key="${questKey}"]`);
  if (!card) return;

  // Ensure dataset stays in sync
  card.dataset.questType = quest.type;

  const progressDiv = card.querySelector('.questProgress');
  if (progressDiv) {
    progressDiv.textContent = `Progress: ${quest.currentCount} / ${quest.targetCount}`;
  }

  const btn = card.querySelector('.completeQuestBtn');
  if (btn) {
    updateQuestButton(btn, quest);
  }
}



/**
 * Update quest button appearance based on completion status
 */
function updateQuestButton(btn, quest) {
  if (quest.isComplete) {
    btn.classList.add('quest-ready');
    btn.classList.remove('quest-not-ready');
    btn.disabled = false;
  } else {
    btn.classList.add('quest-not-ready');
    btn.classList.remove('quest-ready');
    btn.disabled = true;
  }
}

function flashSidePanel(quest){
    logMessage(`${quest} waiting to be turned in!`);
    if (!quest || !quest.isComplete) return;
    const panelQuestButton = document.getElementById('panelQuestButton');
    panelQuestButton.classList.add('quest-complete');
}

/**
 * Check if a specific panel is currently active
 */
function isPanelActive(panelId) {
  const panel = document.getElementById(panelId);
  return panel && panel.classList.contains('active');
}

export function renderQuestPanelAnimations() {
  if (!isPanelActive('panelQuest')) return;

  const heroLevelEl = document.querySelector(".hero-level"); // <-- select the right element
  if (heroLevelEl) {
    if (uiAnimations.heroLevelUp) {
      heroLevelEl.classList.add("level-up-anim");
      console.log("Level up animation triggered!", heroLevelEl);

      // remove after animation ends so it can replay later
      heroLevelEl.addEventListener("animationend", () => {
        heroLevelEl.classList.remove("level-up-anim");
      }, { once: true });
    }
  }
}



/**
 * Get all active quests (useful for debugging)
 */
export function getActiveQuests() {
  return state.quests?.prefixQuests || {};
}