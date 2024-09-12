import * as THREE from 'three';
import { checkCollisions } from './collision.js';
import { adjustToGroundLevel } from './utils.js';
import { updateManaBar } from './ui.js';
import { shootSpell, getAvailableSpell } from './spells.js';

let velocityY = 0;
const gravity = -9.8;
const jumpStrength = 5;
const walkSpeed = 2;
const runSpeed = 5;
let currentSpeed = 0;
const speedTransitionDuration = 0.1;
let mana = 100;
const maxMana = 100;
const manaRegenRate = 100;
let canJump = true;


export class Player {
    constructor() {
        this.baseWalkSpeed = walkSpeed;
        this.baseRunSpeed = runSpeed;
        this.currentWalkSpeed = this.baseWalkSpeed;
        this.currentRunSpeed = this.baseRunSpeed;
        this.speedMultiplier = 1;
        this.speedBoostEndTime = 0;
    }

    increaseSpeed(multiplier, duration) {
        //console.log(`Increasing speed by ${multiplier} for ${duration} seconds`);
        this.speedMultiplier = multiplier;
        this.speedBoostEndTime = Date.now() + duration * 1000;
        this.updateSpeed();
    }

    updateSpeed() {
        const now = Date.now();
        if (now > this.speedBoostEndTime) {
            this.speedMultiplier = 1;
        }
        this.currentWalkSpeed = this.baseWalkSpeed * this.speedMultiplier;
        this.currentRunSpeed = this.baseRunSpeed * this.speedMultiplier;
        //console.log(`Current walk speed: ${this.currentWalkSpeed}, Current run speed: ${this.currentRunSpeed}`);
    }

    getSpeed(isRunning) {
        this.updateSpeed();
        return isRunning ? this.currentRunSpeed : this.currentWalkSpeed;
    }
}

export const player = new Player();

export function handlePlayerMovement(character, characterBoundingBox, keysPressed, delta, mixer, setAction, checkCollisions, collidableObjects, cameraPitch, cameraDistance, updateCameraPosition, camera, isJumping, setIsJumping, updateMana, animationsMap) {
    if (!character || !characterBoundingBox) return;

    // Handle gravity and jumping logic
    if (isJumping || velocityY !== 0) {
        velocityY += gravity * delta;
        const verticalMove = new THREE.Vector3(0, velocityY * delta, 0);
        const isRunning = keysPressed['z'] && keysPressed['shift'];
        let targetSpeed = player.getSpeed(isRunning);

      currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, delta / speedTransitionDuration);

        if (!checkCollisions(verticalMove, collidableObjects, characterBoundingBox)) {
            character.position.y += verticalMove.y;
        } else {
            if (velocityY < 0) {
                setIsJumping(false);
                velocityY = 0;
                adjustToGroundLevel(character, collidableObjects);
                setAction('idle');
                resetJump();
            } else {
                velocityY = 0;
            }
        }
    }

    // Determine if running
    const isRunning = keysPressed['z'] && keysPressed['shift'];

    // Get the appropriate speed
    let targetSpeed = player.getSpeed(isRunning);

    currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, delta / speedTransitionDuration);

    let isMoving = false;
    let direction = new THREE.Vector3();

    // Handle movement in different directions
    if (keysPressed['z']) {
        direction.z += currentSpeed * delta;
        isMoving = true;
    }
    if (keysPressed['s']) {
        direction.z -= player.currentWalkSpeed * delta;
        isMoving = true;
    }
    if (keysPressed['q']) {
        direction.x += currentSpeed * delta;
        isMoving = true;
    }
    if (keysPressed['d']) {
        direction.x -= currentSpeed * delta;
        isMoving = true;
    }

    direction.applyQuaternion(character.quaternion);

    if (!checkCollisions(direction, collidableObjects, characterBoundingBox)) {
        character.position.add(direction);
    }

    characterBoundingBox.updateMatrixWorld();

    // Animation handling logic
    if (!isJumping) {
        let walkAction = animationsMap.get('walking');
        let runAction = animationsMap.get('running');

        if (isMoving) {
            if (isRunning) {
                setAction('running');
                if (runAction) runAction.timeScale = player.speedMultiplier;
            } else if (keysPressed['s']) {
                setAction('walking');
                if (walkAction) walkAction.timeScale = -1;
            } else {
                setAction('walking');
                if (walkAction) walkAction.timeScale = 1;
            }
        } else {
            setAction('idle');
        }
    }

    updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera);

    // Mana regeneration over time
    mana = Math.min(mana + manaRegenRate * delta, maxMana);
    updateMana(mana / maxMana);
}


export function initiateJump(character, mixer, animationsMap, setAction, isJumping, setIsJumping, keysPressed) {
    if (!isJumping && canJump && character) {
        setIsJumping(true);
        canJump = false;
        velocityY = jumpStrength;
        setAction('jumping');

        const jumpAction = animationsMap.get('jumping');
        setTimeout(() => {
            setIsJumping(false);
            if (!keysPressed['z'] && !keysPressed['q'] && !keysPressed['s'] && !keysPressed['d']) {
                setAction('idle');
            }
        }, jumpAction.getClip().duration * 1000);
    }
}

// Add this function to reset the jump ability when the player touches the ground
export function resetJump() {
    canJump = true;
}

export function initiatePunch(character, mixer, animationsMap, setAction, isJumping) {
    if (!isJumping && character) {
        setAction('punching');
    }
}

export function castSpell(character, scene, collidableObjects, camera, verticalCorrection, shootSourceHeight, debugHelpers, fireflyCount, spell, enemies) {
    if (!spell) {
        console.warn('No spell available.');
        return null;
    }

    if (mana < spell.cost) {
        console.warn('Not enough mana to cast spell.');
        return null;
    }

    mana -= spell.cost;
    updateManaBar(document.getElementById('manaBar'), mana / maxMana);

    return shootSpell(character, scene, collidableObjects, camera, verticalCorrection, shootSourceHeight, debugHelpers, fireflyCount, spell, enemies);
}

export function updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera) {
    if (!character || !camera) return;

    const offset = new THREE.Vector3(0, 3, -cameraDistance);
    offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch);

    const desiredCameraPosition = character.position.clone().add(offset.applyQuaternion(character.quaternion));
    const direction = desiredCameraPosition.clone().sub(character.position).normalize();

    const raycaster = new THREE.Raycaster(character.position, direction);
    const intersects = raycaster.intersectObjects(collidableObjects);

    if (intersects.length > 0 && intersects[0].distance < cameraDistance) {
        const collisionPoint = intersects[0].point;
        camera.position.copy(collisionPoint.sub(direction.multiplyScalar(0.1)));
    } else {
        camera.position.lerp(desiredCameraPosition, 0.1);
    }

    camera.lookAt(character.position);
}

export function getMana() {
    return mana;
}

export function setMana(newMana) {
    mana = newMana;
    updateManaBar(document.getElementById('manaBar'), mana / maxMana);
}

export function getMaxMana() {
    return maxMana;
}