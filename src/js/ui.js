// ui.js
import { spells } from './spells.js';

export function createManaBar() {
    const manaBarContainer = document.createElement('div');
    manaBarContainer.style.position = 'absolute';
    manaBarContainer.style.bottom = '20px';
    manaBarContainer.style.left = '80%';
    manaBarContainer.style.width = '200px';
    manaBarContainer.style.height = '20px';
    manaBarContainer.style.border = '2px solid #00ffff';
    document.body.appendChild(manaBarContainer);

    const manaBar = document.createElement('div');
    manaBar.id = 'manaBar';
    manaBar.style.width = '100%';
    manaBar.style.height = '100%';
    manaBar.style.backgroundColor = '#00ffff';
    manaBarContainer.appendChild(manaBar);

    return manaBar;
}

export function updateManaBar(manaBarElement, manaPercentage) {
    if (manaBarElement) {
        manaBarElement.style.width = `${manaPercentage * 100}%`;
    }
}

export function createLifeBar() {
    const lifeBarContainer = document.createElement('div');
    lifeBarContainer.style.position = 'absolute';
    lifeBarContainer.style.bottom = '20px';
    lifeBarContainer.style.left = '70%';
    lifeBarContainer.style.transform = 'translateX(-50%)';
    lifeBarContainer.style.width = '200px';
    lifeBarContainer.style.height = '20px';
    lifeBarContainer.style.border = '2px solid #ff0000';
    document.body.appendChild(lifeBarContainer);

    const lifeBar = document.createElement('div');
    lifeBar.style.width = '100%';
    lifeBar.style.height = '100%';
    lifeBar.style.backgroundColor = '#ff0000';
    lifeBarContainer.appendChild(lifeBar);

    return lifeBar;
}

export function createSeedDisplay(seed) {
    const seedDisplay = document.createElement('div');
    seedDisplay.style.position = 'absolute';
    seedDisplay.style.bottom = '5px';
    seedDisplay.style.left = '5px';
    seedDisplay.style.color = '#ffffff';
    seedDisplay.style.fontSize = '12px';
    seedDisplay.innerText = `Seed: ${seed}`;
    document.body.appendChild(seedDisplay);
    return seedDisplay;
}

export function updateSeedDisplay(seedDisplayElement, newSeed) {
    if (seedDisplayElement) {
        seedDisplayElement.innerText = `Seed: ${newSeed}`;
    }
}

// ui.js
export function createFireflyCounter(initialCount) {
    const counter = document.createElement('div');
    counter.id = 'fireflyCounter';
    counter.style.position = 'absolute';
    counter.style.bottom = '80px';
    counter.style.left = '5%';
    counter.style.color = '#ffffff';
    counter.style.fontSize = '24px';
    counter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    counter.style.padding = '10px';
    counter.style.borderRadius = '5px';
    counter.innerText = `Fireflies: ${initialCount}`;
    document.body.appendChild(counter);
}

export function updateFireflyCounter(count) {
    const counter = document.getElementById('fireflyCounter');
    if (counter) {
        counter.innerText = `Fireflies: ${count}`;
    } else {
        console.warn("Firefly counter element not found");
    }
}

export function createSpellDisplay() {
    const spellDisplay = document.createElement('div');
    spellDisplay.id = 'spellDisplay';
    spellDisplay.style.position = 'absolute';
    spellDisplay.style.top = '50px';
    spellDisplay.style.left = '10px';
    spellDisplay.style.color = '#ffffff';
    spellDisplay.style.fontSize = '15px';
    spellDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    spellDisplay.style.padding = '10px';
    spellDisplay.style.borderRadius = '5px';
    document.body.appendChild(spellDisplay);
}

export function updateSpellUI(spell, fireflyCount) {
    const spellDisplay = document.getElementById('spellDisplay');
    if (spellDisplay) {
        if (spell) {
            const isAvailable = fireflyCount >= spell.firefliesRequired;
            spellDisplay.innerHTML = `
                <strong>Selected Spell:</strong> ${spell.name}<br>
                <strong>Mana Cost:</strong> ${spell.cost}<br>
                <strong>Damage:</strong> ${spell.damage}<br>
                <strong>Fireflies Required:</strong> ${spell.firefliesRequired}<br>
                <strong>Status:</strong> ${isAvailable ? 'Available' : 'Locked'}
            `;
            spellDisplay.style.color = isAvailable ? `#${spell.color.toString(16).padStart(6, '0')}` : '#888888';
        } else {
            spellDisplay.innerHTML = 'Melee Attack';
            spellDisplay.style.color = '#ffffff';
        }
    }
}

export function createSpellSelectionBar(spells) {
    // Add Google Fonts link to the document head
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const spellBar = document.createElement('div');
    spellBar.id = 'spellSelectionBar';
    spellBar.style.position = 'absolute';
    spellBar.style.top = '10px';
    spellBar.style.left = '50%';
    spellBar.style.transform = 'translateX(-50%)';
    spellBar.style.display = 'flex';
    spellBar.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    spellBar.style.padding = '5px';
    spellBar.style.borderRadius = '5px';

    const keys = ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à', ')', '='];
    const displayKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '°', '+'];
    
    // Add melee attack (punch) as the first option
    const meleeSlot = createSpellSlot('Punch', displayKeys[0], 0xA3A3A3, 'img/spells/punch.jpg');
    meleeSlot.dataset.spellIndex = '-1'; // Use -1 for melee attack
    meleeSlot.dataset.key = '&';
    spellBar.appendChild(meleeSlot);

    spells.forEach((spell, index) => {
        const slot = createSpellSlot(spell.name, displayKeys[index + 1], spell.color, spell.iconPath);
        slot.dataset.spellIndex = index.toString();
        slot.dataset.key = keys[index + 1];
        slot.style.display = 'none'; // Initially hide all spell slots
        spellBar.appendChild(slot);
    });

    document.body.appendChild(spellBar);
    return spellBar;
}

function createSpellSlot(spellName, displayKey, color, iconPath) {
    const slotContainer = document.createElement('div');
    slotContainer.style.display = 'flex';
    slotContainer.style.flexDirection = 'column';
    slotContainer.style.alignItems = 'center';
    slotContainer.style.margin = '0 5px';

    const slot = document.createElement('div');
    slot.style.width = '80px';
    slot.style.height = '80px';
    slot.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
    slot.style.display = 'flex';
    slot.style.justifyContent = 'center';
    slot.style.alignItems = 'center';
    slot.style.borderRadius = '5px';
    slot.style.cursor = 'pointer';
    slot.style.position = 'relative';
    slot.style.overflow = 'hidden';

    // Add background image
    if (iconPath) {
        slot.style.backgroundImage = `url(${iconPath})`;
        slot.style.backgroundSize = 'cover';
        slot.style.backgroundPosition = 'center';
    }

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    slot.appendChild(overlay);

    const keyText = document.createElement('div');
    keyText.textContent = displayKey;
    keyText.style.fontSize = '12px';
    keyText.style.color = 'white';
    keyText.style.position = 'absolute';
    keyText.style.top = '5px';
    keyText.style.left = '5px';
    keyText.style.zIndex = '1';
    
    slot.appendChild(keyText);
    slotContainer.appendChild(slot);

    const nameText = document.createElement('div');
    nameText.textContent = spellName;
    nameText.style.fontSize = '12px';
    nameText.style.color = 'white';
    nameText.style.textAlign = 'center';
    nameText.style.marginTop = '5px';
    nameText.style.fontFamily = "'Cinzel', serif";
    nameText.style.textShadow = '0 0 3px black';
    slotContainer.appendChild(nameText);

    return slotContainer;
}



export function updateSelectedSpell(key) {
    //console.log(`updateSelectedSpell called with key: ${key}`);
    const spellBar = document.getElementById('spellSelectionBar');
    if (!spellBar) {
        //console.warn('Spell selection bar not found. Make sure createSpellSelectionBar has been called.');
        return;
    }

    //console.log(`Number of spell slots: ${spellBar.children.length}`);

    let foundMatch = false;
    Array.from(spellBar.children).forEach((slot, index) => {
        //console.log(`Checking slot ${index}: key=${slot.dataset.key}, display=${slot.style.display}`);
        if (slot.dataset.key === key && slot.style.display !== 'none') {
            //console.log(`Match found for key ${key}. Highlighting slot ${index}`);
            highlightSelectedSpell(slot);
            foundMatch = true;
        } else {
            //console.log(`No match for key ${key}. Unhighlighting slot ${index}`);
            unhighlightSpell(slot);
        }
    });

    if (!foundMatch) {
        //console.warn(`No visible slot found for key: ${key}`);
    }
}

function highlightSelectedSpell(slot) {
    ////console.log(`Highlighting slot: ${slot.dataset.key}`);
    slot.style.border = '2px solid white';
    slot.style.boxShadow = '0 0 10px white';
    slot.style.transform = 'scale(1.1)';
    slot.style.transition = 'all 0.3s ease';
    slot.classList.add('selected-spell');
}

function unhighlightSpell(slot) {
    //console.log(`Unhighlighting slot: ${slot.dataset.key}`);
    slot.style.border = 'none';
    slot.style.boxShadow = 'none';
    slot.style.transform = 'scale(1)';
    slot.style.transition = 'all 0.3s ease';
    slot.classList.remove('selected-spell');
}

export function initializeSelectedSpell() {
    //console.log('Initializing selected spell');
    const spellBar = document.getElementById('spellSelectionBar');
    if (spellBar && spellBar.children.length > 0) {
        //console.log('Highlighting first spell slot');
        highlightSelectedSpell(spellBar.children[0]);
    } else {
        //console.warn('Spell bar not found or empty during initialization');
    }
}

export function updateSpellSelectionBar(fireflyCount) {
    //console.log(`Updating spell selection bar. Firefly count: ${fireflyCount}`);
    const spellBar = document.getElementById('spellSelectionBar');
    if (!spellBar) {
        //console.warn('Spell selection bar not found. Make sure createSpellSelectionBar has been called.');
        return;
    }

    Array.from(spellBar.children).forEach((slot, index) => {
        const spellIndex = parseInt(slot.dataset.spellIndex);
        //console.log(`Updating slot ${index}: spellIndex=${spellIndex}`);
        if (spellIndex === -1) {
            slot.style.display = 'flex';
            console.log('Melee attack slot always displayed');
            return;
        }
        const spell = spells[spellIndex];
        const isUnlocked = fireflyCount >= spell.firefliesRequired;
        slot.style.display = isUnlocked ? 'flex' : 'none';
       //console.log(`Slot ${index} (${spell.name}): isUnlocked=${isUnlocked}, display=${slot.style.display}`);

        if (isUnlocked && slot.classList.contains('selected-spell')) {
            //console.log(`Maintaining highlight for selected spell: ${spell.name}`);
            highlightSelectedSpell(slot);
        }
    });
}