// game.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { createLevel, checkCollisionsForCollectibles } from './level.js';
import { handlePlayerMovement, initiateJump, initiatePunch, castSpell, updateCameraPosition, getMana, setMana, getMaxMana } from './player.js';
import { onWindowResize, onMouseMove, onMouseWheel } from './utils.js';
import { checkCollisions } from './collision.js';
import { createManaBar, updateManaBar, createLifeBar, createSeedDisplay, updateSeedDisplay, createCollisionBoxToggleButton, createDebugLinesToggleButton, createFireflyCounter, updateFireflyCounter, createSpellDisplay, updateSpellUI, createSpellSelectionBar, updateSelectedSpell, updateSpellSelectionBar } from './ui.js';
import { getAvailableSpell, spells } from './spells.js';
import Stats from 'stats.js';
import { spawnEnemy } from './enemy.js';
import { NavMesh } from './enemyNavigation.js';
import { initializeSelectedSpell } from './ui.js';

let navMesh;
let scene, camera, renderer, mixer, clock;
let keysPressed = {};
let cameraDistance = 2;
let cameraPitch = 0;
let collidableObjects = [];
let collisionHelpers = [];
let debugHelpers = [];
let character = null;
let characterBoundingBox = null;
let animationsMap = new Map();
let currentAction = '';
let isJumping = false;
let spellAnimations = [];
let manaBarElement = null;
let seedDisplayElement = null;
let seed = generateRandomSeed();
let stairsPosition = null;
let isFPSMode = false;
let collisionBoxVisible = false;
let debugLinesVisible = true;
let currentLevel = 1;
let nearStairs = false;
let fireflyCount = 30;
let currentSpell = null;
let stats;
let stairsPromptVisible = false;
let stairsPrompt = null;
let selectedSpellIndex = 0;
let enemies = [];

const wizardCollisionBoxSize = new THREE.Vector3(0.5, 1, 0.5);
const wizardCollisionBoxOffset = new THREE.Vector3(0, 0.5, 0);
const maxCameraDistance = 10;
const minCameraDistance = 3;
const stairwayTriggerDistance = 3;
let verticalCorrection = 0.25;
let shootSourceHeight = 1.0;
let minCameraPitch = -Math.PI / 4;
let maxCameraPitch = Math.PI / 4;

function init() {
    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, -cameraDistance);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    const renderPixelatedPass = new RenderPixelatedPass(1, scene, camera);
    composer.addPass(renderPixelatedPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    const light1 = new THREE.DirectionalLight(0xfff5e1, 0.8);
    light1.position.set(10, 20, 10);
    scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xe1f0ff, 0.8);
    light2.position.set(-10, 20, -10);
    scene.add(light2);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    clock = new THREE.Clock();

    const loader = new GLTFLoader();
    loader.load('/glb/wizardAnimated-v3.glb', (gltf) => {
        character = gltf.scene;
        character.position.set(0, 0, 0);
        character.position.y += 1;

        scene.add(character);

        mixer = new THREE.AnimationMixer(character);

        gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            animationsMap.set(clip.name.toLowerCase(), action);
        });

        setAction('idle');

        const boundingBoxGeometry = new THREE.BoxGeometry(
            wizardCollisionBoxSize.x,
            wizardCollisionBoxSize.y,
            wizardCollisionBoxSize.z
        );
        const boundingBoxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, visible: false });
        characterBoundingBox = new THREE.Mesh(boundingBoxGeometry, boundingBoxMaterial);

        characterBoundingBox.position.copy(wizardCollisionBoxOffset);
        character.add(characterBoundingBox);

        debugHelpers.push(characterBoundingBox);

        createLevel(scene, collidableObjects, collisionHelpers, wizardCollisionBoxSize, wizardCollisionBoxOffset, clock, seed, character, characterBoundingBox, debugHelpers, increaseMana, addFirefly, enemies);
        console.log(`Number of enemies created: ${enemies.length}`);
        enemies.forEach((enemy, index) => {
            console.log(`Enemy ${index} position:`, enemy.position);
        });
    });

    for (let i = 0; i < 5; i++) {
        enemies.push(spawnEnemy(scene, collidableObjects));
    }

    manaBarElement = createManaBar();
    seedDisplayElement = createSeedDisplay(seed);
    createLifeBar();
    createCollisionBoxToggleButton(toggleCollisionBoxes);
    createDebugLinesToggleButton(toggleDebugLines);
    createFireflyCounter(fireflyCount);
    createSpellDisplay();
    createStairsPrompt();
    const spellBar = createSpellSelectionBar(spells);
    updateSpellSelectionBar(fireflyCount);
    initializeSelectedSpell();

    window.addEventListener('resize', () => onWindowResize(camera, renderer, composer));

    document.addEventListener('keydown', handleKeyDown);

    document.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
        if (!keysPressed['z'] && !keysPressed['q'] && !keysPressed['s'] && !isJumping) {
            setAction('idle');
        }
    });

    document.addEventListener('mousemove', (event) => {
        if (isFPSMode) {
            updateCameraRotation(event);
        } else {
            onMouseMove(character, cameraPitch, cameraDistance, (char, pitch, distance) => {
                cameraPitch = pitch;
                updateCameraPosition(char, pitch, distance, collidableObjects, camera);
            })(event);
        }
    });

    document.addEventListener('wheel', (event) => {
        cameraDistance += event.deltaY * 0.01;
        cameraDistance = THREE.MathUtils.clamp(cameraDistance, minCameraDistance, maxCameraDistance);
        updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera);
    });

    document.addEventListener('mousedown', (event) => {
        if (event.button === 0) {
            castSelectedSpell();
        } else if (event.button === 2) {
            toggleFPSMode(true);
        }
    });

    document.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            toggleFPSMode(false);
        }
    });

    document.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === renderer.domElement) {
            document.addEventListener('mousemove', onMouseMove);
        } else {
            document.removeEventListener('mousemove', onMouseMove);
        }
    });

    animate(composer);
}

function animate(composer) {
    stats.begin();

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (character && characterBoundingBox) {
        handlePlayerMovement(character, characterBoundingBox, keysPressed, delta, mixer, setAction, checkCollisions, collidableObjects, cameraPitch, cameraDistance, updateCameraPosition, camera, isJumping, setIsJumping, (mana) => updateManaBar(manaBarElement, mana), animationsMap);
    }

    spellAnimations = spellAnimations.filter(spellAnimation => spellAnimation(delta));

    checkStairwayProximity();
    checkCollisionsForCollectibles(character, collidableObjects);

    // Update mana UI
    updateManaBar(manaBarElement, getMana() / getMaxMana());

    // Update current spell based on firefly count
    currentSpell = getAvailableSpell(fireflyCount);

    // Update spell UI based on selected spell
    const selectedSpell = selectedSpellIndex === 0 ? null : spells[selectedSpellIndex - 1];
    updateSpellUI(selectedSpell, fireflyCount);

    // Update spell selection bar
    updateSpellSelectionBar(fireflyCount);

    // Update enemies
    enemies = enemies.filter(enemy => {
        if (enemy.health > 0) {
            enemy.update(delta);
            return true;
        } else {
            // Remove dead enemies from the scene
            if (enemy.mesh) {
                scene.remove(enemy.mesh);
            }
            return false;
        }
    });

    // Spawn new enemies if needed
    while (enemies.length < 5) {
        const newEnemy = spawnEnemy(scene, collidableObjects, navMesh);
        if (newEnemy) {
            enemies.push(newEnemy);
        }
    }

    composer.render();

    stats.end();
    requestAnimationFrame(() => animate(composer));
}

enemies.forEach(enemy => enemy.update(delta));
function handleKeyDown(event) {
    keysPressed[event.key.toLowerCase()] = true;
    if (event.key.toLowerCase() === ' ') {
        initiateJump(character, mixer, animationsMap, setAction, isJumping, setIsJumping, keysPressed);
    }
    if (event.key.toLowerCase() === 'enter' && nearStairs) {
        loadNextLevel();
    }
    
    const key = event.key.toLowerCase();
    const spellKeys = ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à', ')','='];
    const index = spellKeys.indexOf(key);

    if (index !== -1) {
        if (index === 0 || (spells[index - 1] && fireflyCount >= spells[index - 1].firefliesRequired)) {
            selectedSpellIndex = index;
            updateSelectedSpell(key);  // Changé de selectedSpellIndex à key
        
            // Update spell UI immediately when a new spell is selected
            const selectedSpell = selectedSpellIndex === 0 ? null : spells[selectedSpellIndex - 1];
            updateSpellUI(selectedSpell, fireflyCount);
        }
    }
}

function castSelectedSpell() {
    if (selectedSpellIndex === 0) {
        // Melee attack
        initiatePunch(character, mixer, animationsMap, setAction, isJumping);
    } else {
        const spell = spells[selectedSpellIndex - 1];
        if (spell && fireflyCount >= spell.firefliesRequired) {
            const spellAnimation = castSpell(character, scene, collidableObjects, camera, verticalCorrection, shootSourceHeight, debugHelpers, fireflyCount, spell, enemies);
            if (spellAnimation) {
                spellAnimations.push(spellAnimation);
            }
        } else {
            console.warn('Not enough fireflies to cast this spell');
        }
    }
}

function checkStairwayProximity() {
    if (!stairsPosition || !character) return;

    const distanceToStairs = character.position.distanceTo(stairsPosition);
    if (distanceToStairs < stairwayTriggerDistance) {
        nearStairs = true;
        showStairsPrompt(true);
    } else {
        nearStairs = false;
        showStairsPrompt(false);
    }
}

function loadNextLevel() {
    currentLevel += 1;
    seed = generateRandomSeed();
    updateSeedDisplay(seedDisplayElement, seed);
    enemies.forEach(enemy => {
        if (enemy.mesh) {
            scene.remove(enemy.mesh);
        }
    });
    enemies = [];
    createLevel(scene, collidableObjects, collisionHelpers, wizardCollisionBoxSize, wizardCollisionBoxOffset, clock, seed, character, characterBoundingBox, debugHelpers, increaseMana, addFirefly,enemies);
    
    for (let i = 0; i < 5; i++) {
        enemies.push(spawnEnemy(scene, collidableObjects));
    }   
    
    nearStairs = false;
    showStairsPrompt(false);
}

function setAction(actionName) {
    if (currentAction === actionName) return;

    const action = animationsMap.get(actionName);
    if (action) {
        const previousAction = animationsMap.get(currentAction);
        action.reset().fadeIn(0.5).play();
        if (previousAction) {
            previousAction.fadeOut(0.5);
        }
        currentAction = actionName;
    }
}

function setIsJumping(state) {
    isJumping = state;
}

function increaseMana(amount) {
    setMana(Math.min(getMana() + amount, getMaxMana()));
    updateManaBar(manaBarElement, getMana() / getMaxMana());
}

function addFirefly() {
    fireflyCount += 1;
    updateFireflyCounter(fireflyCount);
    currentSpell = getAvailableSpell(fireflyCount);
    updateSpellUI(currentSpell, fireflyCount);
    updateSpellSelectionBar(fireflyCount);
}

function updateCameraRotation(event) {
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    camera.rotation.y -= movementX * 0.002;
    camera.rotation.x -= movementY * 0.002;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, minCameraPitch, maxCameraPitch);
}

function toggleFPSMode(enable) {
    isFPSMode = enable;

    if (enable) {
        camera.position.copy(character.position);
        camera.position.y += shootSourceHeight;
        character.visible = false;
    } else {
        character.visible = true;
        camera.position.set(0, 3, -cameraDistance);
    }
}

function toggleCollisionBoxes() {
    collisionBoxVisible = !collisionBoxVisible;
    collisionHelpers.forEach(helper => {
        helper.visible = collisionBoxVisible;
    });
}

function toggleDebugLines() {
    debugLinesVisible = !debugLinesVisible;
    debugHelpers.forEach(helper => {
        helper.visible = debugLinesVisible;
    });
}

function generateRandomSeed() {
    return Math.random().toString(36).substring(2, 15);
}

let stairsPromptCreated = false;
function createStairsPrompt() {
    stairsPrompt = document.createElement('div');
    stairsPrompt.id = 'stairsPrompt';
    stairsPrompt.style.position = 'absolute';
    stairsPrompt.style.top = '50%';
    stairsPrompt.style.left = '50%';
    stairsPrompt.style.transform = 'translate(-50%, -50%)';
    stairsPrompt.style.color = '#ffffff';
    stairsPrompt.style.fontSize = '24px';
    stairsPrompt.style.padding = '10px';
    stairsPrompt.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    stairsPrompt.style.borderRadius = '5px';
    stairsPrompt.style.display = 'none';
    stairsPrompt.innerText = 'Press Enter to go up';
    document.body.appendChild(stairsPrompt);
}

function showStairsPrompt(visible) {
    if (!stairsPromptCreated) {
        createStairsPrompt();
        stairsPromptCreated = true;
    }
    stairsPrompt.style.display = visible ? 'block' : 'none';
}

init();

export { showStairsPrompt, loadNextLevel };