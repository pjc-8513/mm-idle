// questManager.js
import { state } from './state.js';
import { emit, on } from './events.js';
import { prefixes } from './content/definitions.js';
import { logMessage } from './systems/log.js';

// Quest configuration
const QUEST_CONFIG = {
  prefixQuest: {
    enemiesRequired: 5,
    baseExpReward: 100,
    expPerLevel: 20
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
      prefixQuests: {} // Key: prefix name, Value: quest object
    };
  }

  // Generate initial quests for unlocked prefixes
  generatePrefixQuests();

  // Listen for enemy defeats
  on('enemyDefeated', handleEnemyDefeated);

  // Listen for hero level ups to unlock new prefix quests
  on('heroLevelUp', handleHeroLevelUp);

  // Set up UI
  setupQuestUI();
}

/**
 * Generate or update prefix quests based on unlocked prefixes
 */
function generatePrefixQuests() {
  const unlockedPrefixes = prefixes.filter(p => state.heroLevel >= p.unlocks);
  
  unlockedPrefixes.forEach(prefixData => {
    const prefix = prefixData.prefix;
    
    // If quest doesn't exist, create it
    if (!state.quests.prefixQuests[prefix]) {
      state.quests.prefixQuests[prefix] = createPrefixQuest(prefix);
    }
  });

  emit('questsUpdated');
  if (isPanelActive('panelQuest')) {
    renderQuestPanel();
  }
}

/**
 * Create a new prefix quest object
 */
function createPrefixQuest(prefix) {
  return {
    id: `prefix_${prefix}_${Date.now()}`,
    type: 'defeat_prefix',
    prefix: prefix,
    targetCount: QUEST_CONFIG.prefixQuest.enemiesRequired,
    currentCount: 0,
    expReward: QUEST_CONFIG.prefixQuest.baseExpReward + 
               (state.heroLevel * QUEST_CONFIG.prefixQuest.expPerLevel),
    isComplete: false
  };
}

/**
 * Handle enemy defeated event
 */
function handleEnemyDefeated({row, col, enemy}) {
    
  if (!state.quests?.prefixQuests) return;

  const prefix = enemy.prefix;
  const quest = state.quests.prefixQuests[prefix];
    console.log('[quest] enemy / quest: ', enemy.prefix, ' / ', quest);
  if (quest && !quest.isComplete) {
    quest.currentCount++;
    
    // Check if quest is complete
    if (quest.currentCount >= quest.targetCount) {
      quest.isComplete = true;
      emit('questCompleted', quest);
      flashSidePanel(quest);
    }
    

    emit('questProgressUpdated', quest);
    
    // Update UI if quest panel is active
    if (isPanelActive('panelQuest')) {
      updateQuestCard(prefix);
    }
  }
}

/**
 * Handle hero level up - unlock new prefix quests
 */
function handleHeroLevelUp(data) {
  generatePrefixQuests();
}

/**
 * Complete a specific quest and grant rewards
 */
export function completeQuest(prefix) {
  const quest = state.quests.prefixQuests[prefix];
  
  if (!quest || !quest.isComplete) {
    console.warn(`Cannot complete quest for prefix: ${prefix}`);
    return;
  }

  const oldLevel = state.heroLevel;

  // Grant experience
  addHeroExp(quest.expReward);

  // Reset quest (keep it ongoing)
  state.quests.prefixQuests[prefix] = createPrefixQuest(prefix);

  emit('questTurnedIn', {
    prefix,
    expGained: quest.expReward,
    leveledUp: state.heroLevel > oldLevel
  });

  // Update UI
  if (isPanelActive('panelQuest')) {
    updateQuestCard(prefix);
  }
  // Check if there are any quests that are still complete and if not remove the flash animation from side panel button
  const hasActiveQuests = Object.values(state.quests.prefixQuests).some(q => q !== quest && q.isComplete);
  if (!hasActiveQuests){
    const panelQuestButton = document.getElementById('panelQuestButton');
    panelQuestButton.classList.remove('quest-complete');
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
  state.heroExp -= expNeeded;
  state.heroLevel++;

  // Apply stat gains
  if (state.heroGains) {
    for (const [stat, value] of Object.entries(state.heroGains)) {
      if (state.heroStats[stat] !== undefined) {
        state.heroStats[stat] += value;
      }
    }
  }

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

  // Get all prefix quests sorted by prefix
  const questEntries = Object.entries(state.quests.prefixQuests || {});
  
  questEntries.forEach(([prefix, quest]) => {
    const questCard = createQuestCard(prefix, quest);
    container.appendChild(questCard);
  });

  // If no quests available
  if (questEntries.length === 0) {
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
function createQuestCard(prefix, quest) {
  const questCard = document.createElement("div");
  questCard.classList.add("questCard");
  questCard.dataset.prefix = prefix;

  // Quest icon/image area
  const imageDiv = document.createElement("div");
  imageDiv.classList.add("questImage");
  const iconText = document.createElement("div");
  iconText.classList.add("quest-icon");
  iconText.textContent = prefix.charAt(0).toUpperCase();
  imageDiv.appendChild(iconText);

  // Quest info overlay
  const infoOverlay = document.createElement("div");
  infoOverlay.classList.add("questInfo");

  const titleDiv = document.createElement("div");
  titleDiv.classList.add("questTitle");
  titleDiv.textContent = `${prefix} Slayer`;

  const descDiv = document.createElement("div");
  descDiv.classList.add("questDesc");
  descDiv.textContent = `Defeat ${quest.targetCount} ${prefix} enemies`;

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

  // Complete button
  const btn = document.createElement("button");
  btn.classList.add("completeQuestBtn");
  btn.dataset.prefix = prefix;
  
  const btnText = document.createElement("span");
  btnText.textContent = "Complete";
  btn.appendChild(btnText);

  // Set initial button state
  updateQuestButton(btn, quest);

  // Click listener
  btn.addEventListener("click", () => {
    if (quest.isComplete) {
      completeQuest(prefix);
    }
  });

  questCard.appendChild(imageDiv);
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

  if (heroLevelEl){ 
    console.log('[questManager]: ', state.heroLevel);
    console.log('heroLevelEl exists in DOM:', document.body.contains(heroLevelEl), ' | ', heroLevelEl.textContent);
    heroLevelEl.textContent = state.heroLevel;}
  if (heroExpEl) heroExpEl.textContent = Math.floor(state.heroExp);
  if (heroExpNeededEl) heroExpNeededEl.textContent = getExpForLevel(state.heroLevel + 1);

  // Update each quest card
  Object.keys(state.quests.prefixQuests || {}).forEach(prefix => {
    updateQuestCard(prefix);
  });
}

/**
 * Update a specific quest card
 */
function updateQuestCard(prefix) {
  const quest = state.quests.prefixQuests[prefix];
  if (!quest) return;

  const card = document.querySelector(`.questCard[data-prefix="${prefix}"]`);
  if (!card) return;

  // Update progress text
  const progressDiv = card.querySelector('.questProgress');
  if (progressDiv) {
    progressDiv.textContent = `Progress: ${quest.currentCount} / ${quest.targetCount}`;
  }

  // Update button state
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

/**
 * Get all active quests (useful for debugging)
 */
export function getActiveQuests() {
  return state.quests?.prefixQuests || {};
}