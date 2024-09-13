// game.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { createLevel, checkCollisionsForCollectibles } from './level.js';
import {
    handlePlayerMovement,
    initiateJump,
    initiatePunch,
    castSpell,
    updateCameraPosition,
    getMana,
    setMana,
    getMaxMana,
    player,
    increaseMana,
    addFirefly,
    getFireflyCount,
    setFireflyCount
} from './player.js';
import { onWindowResize, onMouseMove, onMouseWheel } from './utils.js';
import { checkCollisions } from './collision.js';
import {
    createManaBar,
    updateManaBar,
    createLifeBar,
    createSeedDisplay,
    updateSeedDisplay,
    createFireflyCounter,
    updateFireflyCounter,
    createSpellDisplay,
    updateSpellUI,
    createSpellSelectionBar,
    updateSelectedSpell,
    updateSpellSelectionBar,
    initializeSelectedSpell
} from './ui.js';
import { getAvailableSpell, spells } from './spells.js';
import Stats from 'stats.js';
import { spawnEnemy } from './enemy.js';
import { NavMesh } from './enemyNavigation.js';

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

let isLoading = false;
let controlsEnabled = false;

function init() {
    // Configuration de l'écouteur pour le bouton "Jouer"
    const playButton = document.getElementById('play-button');
    if (playButton) {
        playButton.addEventListener('click', () => {
            showMainMenu(false);
            startGame();
        });
    }
}

function startGame() {
    isLoading = true;
    showLoadingScreen(true);

    // Initialisation de la scène, caméra, rendu, etc.
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

    // Démarrer le chargement des assets et du niveau
    loadLevel().then(() => {
        isLoading = false;
        controlsEnabled = true;
        showLoadingScreen(false);
        // Démarrer la boucle d'animation
        animate(composer);
    }).catch((error) => {
        console.error('Échec du chargement du jeu :', error);
    });

    manaBarElement = createManaBar();
    seedDisplayElement = createSeedDisplay(seed);
    createLifeBar();
    createFireflyCounter(getFireflyCount());
    createSpellDisplay();
    createStairsPrompt();
    const spellBar = createSpellSelectionBar(spells);
    updateSpellSelectionBar(getFireflyCount());
    initializeSelectedSpell();

    window.addEventListener('resize', () => onWindowResize(camera, renderer, composer));
}

function loadLevel() {
    return new Promise((resolve, reject) => {
        // Charger les assets, créer le niveau, etc.
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

            createLevel(
                scene,
                collidableObjects,
                collisionHelpers,
                wizardCollisionBoxSize,
                wizardCollisionBoxOffset,
                clock,
                seed,
                character,
                characterBoundingBox,
                debugHelpers,
                enemies
            ).then(() => {
                console.log(`Nombre d'ennemis créés : ${enemies.length}`);
                enemies.forEach((enemy, index) => {
                    console.log(`Position de l'ennemi ${index} :`, enemy.position);
                });
                resolve();
            }).catch((error) => {
                console.error('Erreur lors du chargement du niveau :', error);
                reject(error);
            });
        }, undefined, (error) => {
            console.error('Une erreur s\'est produite lors du chargement du modèle du personnage :', error);
            reject(error);
        });
    });
}

function animate(composer) {
    if (!controlsEnabled) return; // Arrête l'animation si les contrôles ne sont pas activés

    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);
    if (character && characterBoundingBox) {
        handlePlayerMovement(
            character,
            characterBoundingBox,
            keysPressed,
            delta,
            mixer,
            setAction,
            checkCollisions,
            collidableObjects,
            cameraPitch,
            cameraDistance,
            updateCameraPosition,
            camera,
            isJumping,
            setIsJumping,
            updateManaBar,
            animationsMap
        );
    }

    spellAnimations = spellAnimations.filter(spellAnimation => spellAnimation(delta));

    checkStairwayProximity();
    checkCollisionsForCollectibles(character, collidableObjects);

    updateManaBar(manaBarElement, getMana() / getMaxMana());
    currentSpell = getAvailableSpell(getFireflyCount());
    const selectedSpell = selectedSpellIndex === 0 ? null : spells[selectedSpellIndex - 1];
    updateSpellUI(selectedSpell, getFireflyCount());
    updateSpellSelectionBar(getFireflyCount());

    // Mise à jour des ennemis existants
    enemies = enemies.filter(enemy => {
        if (enemy.health > 0) {
            enemy.update(delta);
            return true;
        } else {
            if (enemy.mesh) {
                scene.remove(enemy.mesh);
            }
            return false;
        }
    });

    composer.render();

    requestAnimationFrame(() => animate(composer));
}

function handleKeyDown(event) {
    if (!controlsEnabled) return;
    keysPressed[event.key.toLowerCase()] = true;
    if (event.key.toLowerCase() === ' ') {
        initiateJump(character, mixer, animationsMap, setAction, isJumping, setIsJumping, keysPressed);
    }
    if (event.key.toLowerCase() === 'enter' && nearStairs) {
        loadNextLevel();
    }

    const key = event.key.toLowerCase();
    const spellKeys = ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à', ')', '='];
    const index = spellKeys.indexOf(key);

    if (index !== -1) {
        if (index === 0 || (spells[index - 1] && getFireflyCount() >= spells[index - 1].firefliesRequired)) {
            selectedSpellIndex = index;
            updateSelectedSpell(key);

            // Mettre à jour l'UI du sort immédiatement lorsque qu'un nouveau sort est sélectionné
            const selectedSpell = selectedSpellIndex === 0 ? null : spells[selectedSpellIndex - 1];
            updateSpellUI(selectedSpell, getFireflyCount());
        }
    }
}

document.addEventListener('keydown', handleKeyDown);

document.addEventListener('keyup', (event) => {
    if (!controlsEnabled) return;
    keysPressed[event.key.toLowerCase()] = false;
    if (!keysPressed['z'] && !keysPressed['q'] && !keysPressed['s'] && !isJumping) {
        setAction('idle');
    }
});

document.addEventListener('mousemove', (event) => {
    if (!controlsEnabled) return;
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
    if (!controlsEnabled) return;
    cameraDistance += event.deltaY * 0.01;
    cameraDistance = THREE.MathUtils.clamp(cameraDistance, minCameraDistance, maxCameraDistance);
    updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera);
});

document.addEventListener('mousedown', (event) => {
    if (!controlsEnabled) return;
    if (event.button === 0) {
        castSelectedSpell();
    } else if (event.button === 2) {
        toggleFPSMode(true);
    }
});

document.addEventListener('mouseup', (event) => {
    if (!controlsEnabled) return;
    if (event.button === 2) {
        toggleFPSMode(false);
    }
});

document.addEventListener('click', () => {
    if (!controlsEnabled) return;
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (!controlsEnabled) return;
    if (document.pointerLockElement === renderer.domElement) {
        document.addEventListener('mousemove', onMouseMove);
    } else {
        document.removeEventListener('mousemove', onMouseMove);
    }
});

function checkStairwayProximity() {
    if (!stairsPosition || !character) return;

    const distanceToStairs = character.position.distanceTo(stairsPosition);
    if (distanceToStairs < stairwayTriggerDistance) {
        nearStairs = true; // Add this line
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
    createLevel(
        scene,
        collidableObjects,
        collisionHelpers,
        wizardCollisionBoxSize,
        wizardCollisionBoxOffset,
        clock,
        seed,
        character,
        characterBoundingBox,
        debugHelpers,
        enemies,
    );

    nearStairs = false;
    showStairsPrompt(false);
}

document.addEventListener('loadNextLevel', loadNextLevel);


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

function castSelectedSpell() {
    const spell = selectedSpellIndex === 0 ? null : spells[selectedSpellIndex - 1];
    const spellAnimation = castSpell(
        character,
        scene,
        collidableObjects,
        camera,
        verticalCorrection,
        shootSourceHeight,
        debugHelpers,
        getFireflyCount(),
        spell,
        enemies
    );
    if (spellAnimation) {
        spellAnimations.push(spellAnimation);
    } else {
        initiatePunch(character, mixer, animationsMap, setAction, isJumping);
    }
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
    stairsPrompt.innerText = 'Appuyez sur Entrée pour monter';
    document.body.appendChild(stairsPrompt);
}

function showStairsPrompt(visible) {
    if (!stairsPromptCreated) {
        createStairsPrompt();
        stairsPromptCreated = true;
    }
    stairsPrompt.style.display = visible ? 'block' : 'none';
}

function showMainMenu(show) {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        mainMenu.style.display = show ? 'flex' : 'none';
    }
}

function showLoadingScreen(show) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = show ? 'flex' : 'none';
    }
}

// Démarrer l'initialisation lorsque le DOM est chargé
window.addEventListener('DOMContentLoaded', () => {
    init();
});
