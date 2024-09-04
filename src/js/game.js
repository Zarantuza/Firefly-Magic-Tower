import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { createLevel } from './level.js';
import { handlePlayerMovement, initiateJump, initiatePunch, shootSpell, updateCameraPosition } from './player.js';
import { onWindowResize, onMouseMove, onMouseWheel } from './utils.js';
import { checkCollisions } from './collision.js';
import { createManaBar, updateManaBar, createLifeBar, createSeedDisplay, updateSeedDisplay, createCollisionBoxToggleButton, createDebugLinesToggleButton, createFireflyCounter, updateFireflyCounter } from './ui.js';
import Stats from 'stats.js';

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
let mana = 100;
const maxMana = 100;
let currentLevel = 1;
let nearStairs = false;
let fireflyCount = 49;
let activeSpell = 'blue'; // Default spell
let stats;
let stairsPromptVisible = false;
let stairsPrompt = null;

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
    stats.showPanel(0); // 0: FPS, 1: ms/frame, 2: memory usage
    document.body.appendChild(stats.dom);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, -cameraDistance);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Post-processing setup
    const composer = new EffectComposer(renderer);
    const renderPixelatedPass = new RenderPixelatedPass(1, scene, camera); // Adjust pixel size as needed
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

        createLevel(scene, collidableObjects, collisionHelpers, wizardCollisionBoxSize, wizardCollisionBoxOffset, clock, seed, character, characterBoundingBox, debugHelpers, increaseMana, addFirefly);
    });

    manaBarElement = createManaBar();
    seedDisplayElement = createSeedDisplay(seed);
    createLifeBar();
    createCollisionBoxToggleButton(toggleCollisionBoxes);
    createDebugLinesToggleButton(toggleDebugLines);
    createFireflyCounter(fireflyCount);
    createStairsPrompt();

    window.addEventListener('resize', () => onWindowResize(camera, renderer, composer));

    document.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
        if (event.key.toLowerCase() === ' ') {
            initiateJump(character, mixer, animationsMap, setAction, isJumping, setIsJumping, keysPressed);
        }
        if (event.key.toLowerCase() === 'enter' && nearStairs) {
            loadNextLevel();
        }
    });

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
            if (fireflyCount >= 5) {
                initiatePunch(character, mixer, animationsMap, setAction, isJumping);
                const spellAnimation = shootSpell(character, scene, collidableObjects, camera, verticalCorrection, shootSourceHeight, debugHelpers, activeSpell);
                if (spellAnimation) {
                    spellAnimations.push(spellAnimation);
                }
            }
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

    animate(composer); // Pass composer to the animate function
}

function animate(composer) {
    stats.begin(); // Start monitoring FPS

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (character && characterBoundingBox) {
        handlePlayerMovement(character, characterBoundingBox, keysPressed, delta, mixer, setAction, checkCollisions, collidableObjects, cameraPitch, cameraDistance, updateCameraPosition, camera, isJumping, setIsJumping, (mana) => updateManaBar(manaBarElement, mana));
    }

    spellAnimations = spellAnimations.filter(spellAnimation => spellAnimation(delta));

    checkStairwayProximity();
    checkCollisionsForCollectibles();

    composer.render(); // Use composer to render with post-processing

    stats.end(); // End monitoring FPS
    requestAnimationFrame(() => animate(composer));
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
    createLevel(scene, collidableObjects, collisionHelpers, wizardCollisionBoxSize, wizardCollisionBoxOffset, clock, seed, character, characterBoundingBox, debugHelpers, increaseMana, addFirefly);
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
    mana = Math.min(mana + amount, maxMana);
    updateManaBar(manaBarElement, mana / maxMana);
}

function addFirefly() {
    fireflyCount += 1;
    updateFireflyCounter(fireflyCount);
    updateActiveSpell();
}

function updateActiveSpell() {
    if (fireflyCount >= 500) {
        activeSpell = 'red';
    } else if (fireflyCount >= 50) {
        activeSpell = 'yellow';
    } else if (fireflyCount >= 5) {
        activeSpell = 'blue';
    } else {
        activeSpell = null;
    }
}

function checkCollisionsForCollectibles() {
    collidableObjects.forEach((obj) => {
        if (obj.userData.isCollectible) {
            const distance = character.position.distanceTo(obj.position);
            if (distance < 1) {
                if (typeof obj.userData.collect === 'function') {
                    obj.userData.collect();
                }
            }
        }
    });
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
    let stairsPrompt = document.getElementById('stairsPrompt');

    if (!stairsPrompt) {
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
        stairsPromptCreated = true;
    }
}

function showStairsPrompt(visible) {
    if (!stairsPromptCreated) {
        createStairsPrompt();
    }
    const stairsPrompt = document.getElementById('stairsPrompt');
    
    if (stairsPrompt && stairsPrompt.style.display !== (visible ? 'block' : 'none')) {
        stairsPrompt.style.display = visible ? 'block' : 'none';
    }
}

export { showStairsPrompt, loadNextLevel };
init();
