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

export function createCollisionBoxToggleButton(toggleCollisionBoxes) {
    const button = document.createElement('button');
    button.style.position = 'absolute';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '1000';
    button.style.padding = '10px';
    button.style.backgroundColor = '#333';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';

    button.innerText = 'Toggle Collision Boxes';
    button.style.pointerEvents = 'auto';

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleCollisionBoxes();
    });

    document.body.appendChild(button);
}

export function createDebugLinesToggleButton(toggleDebugLines) {
    const button = document.createElement('button');
    button.style.position = 'absolute';
    button.style.top = '50px';
    button.style.right = '10px';
    button.style.zIndex = '1000';
    button.style.padding = '10px';
    button.style.backgroundColor = '#555';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';

    button.innerText = 'Toggle Debug Lines';
    button.style.pointerEvents = 'auto';

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleDebugLines();
    });

    document.body.appendChild(button);
}

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
    }
}

export function createSpellDisplay() {
    const spellDisplay = document.createElement('div');
    spellDisplay.id = 'spellDisplay';
    spellDisplay.style.position = 'absolute';
    spellDisplay.style.top = '20px';
    spellDisplay.style.left = '20px';
    spellDisplay.style.color = '#ffffff';
    spellDisplay.style.fontSize = '18px';
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

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9','0'];
    
    // Add melee attack as the first option
    const meleeSlot = createSpellSlot('Melee', '&', 0xffffff);
    spellBar.appendChild(meleeSlot);

    spells.forEach((spell, index) => {
        const slot = createSpellSlot(spell.name, keys[index + 1], spell.color);
        spellBar.appendChild(slot);
    });

    document.body.appendChild(spellBar);
}

function createSpellSlot(spellName, key, color) {
    const slot = document.createElement('div');
    slot.style.width = '50px';
    slot.style.height = '50px';
    slot.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
    slot.style.margin = '0 5px';
    slot.style.display = 'flex';
    slot.style.flexDirection = 'column';
    slot.style.justifyContent = 'center';
    slot.style.alignItems = 'center';
    slot.style.borderRadius = '5px';
    slot.style.cursor = 'pointer';

    const keyText = document.createElement('div');
    keyText.textContent = key;
    keyText.style.fontSize = '12px';
    keyText.style.color = 'white';

    const nameText = document.createElement('div');
    nameText.textContent = spellName;
    nameText.style.fontSize = '10px';
    nameText.style.color = 'white';
    nameText.style.textAlign = 'center';

    slot.appendChild(keyText);
    slot.appendChild(nameText);

    return slot;
}

export function updateSpellSelectionBar(fireflyCount) {
    const spellBar = document.getElementById('spellSelectionBar');
    if (spellBar) {
        Array.from(spellBar.children).forEach((slot, index) => {
            if (index === 0) return; // Skip melee attack
            const spell = spells[index - 1];
            const isUnlocked = fireflyCount >= spell.firefliesRequired;
            slot.style.opacity = isUnlocked ? '1' : '0.5';
            slot.style.cursor = isUnlocked ? 'pointer' : 'not-allowed';
        });
    }
}

export function updateSelectedSpell(index) {
    const spellBar = document.getElementById('spellSelectionBar');
    if (spellBar) {
        Array.from(spellBar.children).forEach((slot, i) => {
            if (i === index) {
                slot.style.border = '2px solid white';
            } else {
                slot.style.border = 'none';
            }
        });
    }
}