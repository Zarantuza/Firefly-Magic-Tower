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
