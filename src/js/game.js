// game.js
import * as THREE from 'three';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';  // Add this line

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';  // Add this line

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
    updateLifeBar, 
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

let composer, outlinePass;
let effect;
let navMesh;
let scene, camera, renderer, mixer, clock;
let keysPressed = {};
let cameraDistance = 0;
let cameraPitch = 0;
let collidableObjects = [];
let collisionHelpers = [];
let debugHelpers = [];
let character = null;
let characterBoundingBox = null;
let animationsMap = new Map();
let currentAction = '';
let isJumping = false;
let isPunching = false;
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
let isRunning = false;
let gameOverScreenCreated = false;
let firefliesCollected = 0;
let enemiesKilled = 0;




const wizardCollisionBoxSize = new THREE.Vector3(0.5, 1, 0.5);
const wizardCollisionBoxOffset = new THREE.Vector3(0, 0.5, 0);
const maxCameraDistance = 5;
const minCameraDistance = 1;
const stairwayTriggerDistance = 3;
let verticalCorrection = 0.25;
let shootSourceHeight = 1.0;
const minCameraPitch = -Math.PI / 2;  // Looking straight down
const maxCameraPitch = Math.PI / 2;   // Looking straight up


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

function createGameOverScreen() {
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'gameOverScreen';
    gameOverScreen.style.position = 'absolute';
    gameOverScreen.style.top = '50%';
    gameOverScreen.style.left = '50%';
    gameOverScreen.style.transform = 'translate(-50%, -50%)';
    gameOverScreen.style.color = '#ffffff';
    gameOverScreen.style.fontSize = '48px';
    gameOverScreen.style.padding = '20px';
    gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOverScreen.style.borderRadius = '5px';
    gameOverScreen.style.textAlign = 'center';
    gameOverScreen.style.display = 'none';  // Hidden initially

    const statsDiv = document.createElement('div');
    statsDiv.id = 'gameStats';  // This div will hold the game stats
    statsDiv.style.fontSize = '24px';
    statsDiv.style.marginTop = '20px';

    gameOverScreen.appendChild(statsDiv);

    const restartButton = document.createElement('button');
    restartButton.innerText = 'Restart';
    restartButton.style.marginTop = '20px';
    restartButton.style.fontSize = '24px';
    restartButton.style.cursor = 'pointer';
    restartButton.addEventListener('click', restartGame);  // Attach restart function

    gameOverScreen.appendChild(restartButton);
    document.body.appendChild(gameOverScreen);

    gameOverScreenCreated = true;
}

function initializeRenderer() {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create EffectComposer
    composer = new EffectComposer(renderer);

    // Create RenderPass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Create RenderPixelatedPass (if you want to keep this effect)
    const renderPixelatedPass = new RenderPixelatedPass(1, scene, camera);
    composer.addPass(renderPixelatedPass);

    // Create OutlinePass
    outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    outlinePass.edgeStrength = 3;
    outlinePass.edgeGlow = 0;
    outlinePass.edgeThickness = 1;
    outlinePass.pulsePeriod = 0;
    outlinePass.visibleEdgeColor.set('#ffffff');
    outlinePass.hiddenEdgeColor.set('#190a05');
    composer.addPass(outlinePass);

    // Create OutputPass
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
}

function showGameOverScreen(visible) {
    if (!gameOverScreenCreated) {
        createGameOverScreen();  // Ensure the screen is created
    }

    const gameOverScreen = document.getElementById('gameOverScreen');

    if (gameOverScreen) {
        // Don't populate stats for now
        gameOverScreen.style.display = visible ? 'block' : 'none';
    } else {
        console.error("Game over screen element not found");
    }
}





function restartGame() {
    // Reset player health and other game-related variables
    player.health = player.maxHealth;
    firefliesCollected = 0;
    enemiesKilled = 0;
    
    updateLifeBar(1);  // Life bar should show full health
    loadLevel();  // Re-load the level or reset game state as needed
    
    controlsEnabled = true;  // Re-enable player controls
    showGameOverScreen(false);  // Hide the game over screen
    startGame();  // Restart the game loop
}





// Listen for the custom "gameOver" event from player.js
// Listen for the custom "gameOver" event from player.js
document.addEventListener('gameOver', (event) => {
    controlsEnabled = false;  // Disable player controls
    const { totalTime } = event.detail;  // Get the total time from the event
    showGameOverScreen(true, totalTime);  // Show the game over screen with stats
});





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
    document.body.appendChild(renderer.domElement);

    initializeRenderer();

    effect = new OutlineEffect(renderer);

    // Remove duplicate line
    // document.body.appendChild(renderer.domElement);

    // Remove these lines as they're now handled in initializeRenderer
    // const composer = new EffectComposer(renderer);
    // const renderPixelatedPass = new RenderPixelatedPass(1, scene, camera);
    // composer.addPass(renderPixelatedPass);
    // const outputPass = new OutputPass();
    // composer.addPass(outputPass);

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
        animate();  // Remove composer argument
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
            const boundingBoxMaterial = new THREE.MeshToonMaterial ({ color: 0x00ff00, wireframe: true, visible: false });
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
            ).then(({ stairsPosition: newStairsPosition, navMesh: newNavMesh }) => {
                stairsPosition = newStairsPosition;
                navMesh = newNavMesh;
                console.log(`Nombre d'ennemis créés : ${enemies.length}`);
                enemies.forEach((enemy, index) => {
                    console.log(`Position de l'ennemi ${index} :`, enemy.position);
                });
                resolve();
            }).catch((error) => {
                console.error('Erreur lors du chargement du niveau :', error);
                reject(error);
            });
        });
    });
}



function animate() {
    if (!controlsEnabled) return; // Stops animation when controls are disabled (e.g., after game over)

    const delta = clock.getDelta();

    // Update character animations
    if (mixer) mixer.update(delta);

    if (character && characterBoundingBox && controlsEnabled) {
        // Handle character movement
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
            animationsMap,
            isPunching
        );
    }

    // Handle spell animations
    spellAnimations = spellAnimations.filter(spellAnimation => spellAnimation(delta));

    // Check proximity to stairway and collectibles
    checkStairwayProximity();
    checkCollisionsForCollectibles(character, collidableObjects);

    // Update the mana bar, selected spells, and the UI
    updateManaBar(manaBarElement, getMana() / getMaxMana());
    currentSpell = getAvailableSpell(getFireflyCount());
    const selectedSpell = selectedSpellIndex === 0 ? null : spells[selectedSpellIndex - 1];
    updateSpellUI(selectedSpell, getFireflyCount());
    updateSpellSelectionBar(getFireflyCount());

    // Update enemy states
    if (controlsEnabled) {
        enemies = enemies.filter(enemy => {
            if (!enemy.isDead) {
                enemy.update(delta);
                return true;
            }
            return false; // Remove dead enemies
        });
    }

    // Enemies update (e.g., pursuing the player)
    if (character && character.position && controlsEnabled) {
        enemies.forEach(enemy => {
            enemy.update(delta, character.position, player, character);
        });
    }

    // FPS Mode: Update camera to stay at character's position and rotate based on mouse movement
    if (isFPSMode) {
        // In FPS mode, position the camera at the character's head (or eye level)
        camera.position.copy(character.position);
        camera.position.y += shootSourceHeight; // Adjust to character's height (eye level)
    } else {
        // Third-person mode: Update camera position to follow behind the character
        updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera);
    }

    // Update outline pass to highlight interactive objects
    updateOutlinePass();

    // Render the scene using EffectComposer
    composer.render();

    // Request the next frame
    requestAnimationFrame(animate);
}

function updateOutlinePass() {
    // Add objects to be outlined
    const outlineObjects = [];
    if (character) outlineObjects.push(character);
    enemies.forEach(enemy => {
        if (enemy.mesh) outlineObjects.push(enemy.mesh);
    });
    // Add other interactive objects like collectibles, stairs, etc.

    outlinePass.selectedObjects = outlineObjects;
}


function rotateCameraInFPS(event) {
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Rotate the camera based on mouse movement
    camera.rotation.y -= movementX * 0.002; // Horizontal rotation
    camera.rotation.x -= movementY * 0.002; // Vertical rotation

    // Limit camera pitch to avoid over-rotation (e.g., looking too far up or down)
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 2, Math.PI / 2);
}



// game.js

// Assurez-vous que 'keysPressed' est déclaré au niveau global ou accessible dans le contexte

function handleKeyUp(event) {
    // Convertir la touche en minuscule pour uniformiser
    const key = event.key.toLowerCase();

    // Mettre à jour l'état de la touche dans 'keysPressed'
    keysPressed[key] = false;

    console.log(`Key released: ${key}`, keysPressed);

    // Si nécessaire, ajoutez des actions spécifiques lors du relâchement de certaines touches
    // Par exemple, si vous souhaitez arrêter une action lorsque la touche est relâchée

    // Si vous utilisez des états spécifiques pour les actions du personnage, vous pouvez les gérer ici
    if (key === 'z' || key === 'q' || key === 's' || key === 'd') {
        // Vérifier si aucune des touches de déplacement n'est pressée
        if (!keysPressed['z'] && !keysPressed['q'] && !keysPressed['s'] && !keysPressed['d']) {
            setAction('idle');
        }
    }

    // Si vous avez des états comme 'isRunning', vous pouvez les gérer ici
    if (key === 'shift') {
        // Par exemple, désactiver le mode course
        isRunning = false;
    }

    // Empêcher le comportement par défaut du navigateur si nécessaire
    // Par exemple, pour empêcher le défilement lors de l'utilisation des touches fléchées
    // event.preventDefault();
}
document.addEventListener('keyup', handleKeyUp);


function handleKeyDown(event) {
    const key = event.key.toLowerCase();

    if (!controlsEnabled) return;

    keysPressed[key] = true;

    if (key === 'shift') {
        isRunning = true;
    }

    if (key === ' ') {
        initiateJump(
            character,
            mixer,
            animationsMap,
            setAction,
            isJumping,
            isPunching,
            setIsJumping,
            keysPressed,
            collidableObjects,
            enemies,
            scene // Added collidableObjects
        );
    }

    if (key === 'enter' && nearStairs) {
        loadNextLevel();
    }

    const spellKeys = ['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à', ')', '='];
    const index = spellKeys.indexOf(key);

    if (index !== -1) {
        const fireflyCount = getFireflyCount();
        if (index === 0 || (spells[index - 1] && fireflyCount >= spells[index - 1].firefliesRequired)) {
            selectedSpellIndex = index;
            updateSelectedSpell(key);

            // Update the spell UI immediately when a new spell is selected
            const selectedSpell = selectedSpellIndex === 0 ? null : spells[selectedSpellIndex - 1];
            updateSpellUI(selectedSpell, fireflyCount);
        }
    }
}

document.addEventListener('keydown', handleKeyDown);

document.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
    if (event.key.toLowerCase() === 'shift') {
        isRunning = false;
    }
    if (!keysPressed['z'] && !keysPressed['q'] && !keysPressed['s'] && !isJumping) {
        setAction('idle');
    }
});



document.addEventListener('mousemove', (event) => {
    if (!controlsEnabled) return;
    if (isFPSMode) {
        // FPS mode: rotate the camera based on mouse movement
        updateCameraRotation(event);
    } else {
        // Third-person mode: move the camera around the character
        onMouseMove(character, cameraPitch, cameraDistance, (char, pitch, distance) => {
            cameraPitch = pitch;
            updateCameraPosition(char, pitch, distance, collidableObjects, camera);
        })(event);
    }
});


document.addEventListener('wheel', (event) => {
    if (!controlsEnabled) return;

    // Adjust cameraDistance based on mouse wheel scroll (deltaY)
    cameraDistance += event.deltaY * 0.01;

    // Clamp the cameraDistance between min and max distances
    cameraDistance = THREE.MathUtils.clamp(cameraDistance, minCameraDistance, maxCameraDistance);

    // Update the camera position based on the new distance and current pitch
    updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera);
});



document.addEventListener('mousedown', (event) => {
    if (!controlsEnabled) return;
    if (event.button === 0) {
        castSelectedSpell();
    }
    // Toggle FPS mode with right-click (button 2)
    if (event.button === 2) {
        toggleFPSMode(!isFPSMode);
    }
});

function toggleFPSMode(enable) {
    isFPSMode = enable;

    if (enable) {
        // Switch to FPS mode: place camera at character's head height
        camera.position.copy(character.position);
        camera.position.y += shootSourceHeight; // Adjust height to character's eye level

        character.visible = false; // Hide character in FPS mode
        document.addEventListener('mousemove', rotateCameraInFPS); // Start tracking mouse movement
    } else {
        // Switch back to third-person mode: reset camera behind character
        character.visible = true;
        camera.position.set(0, 3, -cameraDistance); // Set the camera behind the character
        document.removeEventListener('mousemove', rotateCameraInFPS); // Stop tracking mouse movement
    }
}




document.addEventListener('click', () => {
    if (!controlsEnabled) return;
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
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
    console.log(`Loading next level. Current level: ${currentLevel}`);
    currentLevel += 1;
    seed = generateRandomSeed();
    console.log(`New seed generated: ${seed}`);
    updateSeedDisplay(seedDisplayElement, seed);
    
    console.log(`Removing ${enemies.length} enemies from previous level`);
    enemies.forEach(enemy => {
        if (enemy.mesh) {
            scene.remove(enemy.mesh);
        }
    });
    enemies = [];

    console.log('Clearing collidable objects:', collidableObjects.length);
    collidableObjects.forEach(obj => scene.remove(obj));
    collidableObjects = [];

    console.log('Creating new level');

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
    ).then(({ stairsPosition: newStairsPosition, navMesh: newNavMesh, enemies: newEnemies }) => {
        stairsPosition = newStairsPosition;
        navMesh = newNavMesh;
        enemies = newEnemies; // Update the global enemies array
        console.log(`Level ${currentLevel} loaded. Enemy count: ${enemies.length}`);
        console.log('Collidable objects after level creation:', collidableObjects.length);
        console.log('Player position:', character.position);
        if (navMesh) {
            console.log('NavMesh nodes:', navMesh.nodes.length);
        } else {
            console.warn('NavMesh is undefined after level creation');
        }
    }).catch(error => {
        console.error('Error loading next level:', error);
    });

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

function setIsPunching(state) {
    isPunching = state;
}

// game.js
function castSelectedSpell() {
    if (selectedSpellIndex === 0) {
        // Si le punch est sélectionné
        initiatePunch(
            character,
            mixer,
            animationsMap,
            setAction,
            isJumping,
            isPunching,
            setIsPunching,
            keysPressed,
            collidableObjects,
            enemies,
            scene // Passer la scène ici
        );
    } else {
        // Si un sort est sélectionné
        const spell = spells[selectedSpellIndex - 1];
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
        }
    }
}




function updateCameraRotation(event) {
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Update camera yaw (left-right rotation)
    camera.rotation.y -= movementX * 0.002;

    // Update camera pitch (up-down rotation) and clamp to prevent over-rotation
    camera.rotation.x -= movementY * 0.002;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, minCameraPitch, maxCameraPitch);
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
