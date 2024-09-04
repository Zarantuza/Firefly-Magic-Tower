import * as THREE from 'three';
import { checkCollisions } from './collision.js';
import { adjustToGroundLevel } from './utils.js';
import { updateManaBar } from './ui.js';

let velocityY = 0;
const gravity = -9.8;
const jumpStrength = 5;
let walkSpeed = 2;
let runSpeed = 5;
let currentSpeed = 0;
const speedTransitionDuration = 0.5;
let mana = 100;
const maxMana = 100;
const manaRegenRate = 10;
const spellCost = 10;
const BLOOM_SCENE = 1;

export function handlePlayerMovement(character, characterBoundingBox, keysPressed, delta, mixer, setAction, checkCollisions, collidableObjects, cameraPitch, cameraDistance, updateCameraPosition, camera, isJumping, setIsJumping, updateMana, animationsMap) {
    if (!character || !characterBoundingBox) return;

    // Handle gravity and jumping logic
    if (isJumping || velocityY !== 0) {
        velocityY += gravity * delta;
        const verticalMove = new THREE.Vector3(0, velocityY * delta, 0);

        if (!checkCollisions(verticalMove, collidableObjects, characterBoundingBox)) {
            character.position.y += verticalMove.y;
        } else {
            if (velocityY < 0) {
                setIsJumping(false);
                velocityY = 0;
                adjustToGroundLevel(character, collidableObjects);
                setAction('idle');
            } else {
                velocityY = 0;
            }
        }
    }

    // Determine speed based on the direction of movement
    let targetSpeed = walkSpeed; // Default to walking speed
    if (keysPressed['z'] && keysPressed['shift']) { // Run forward if 'shift' is pressed with forward key 'z'
        targetSpeed = runSpeed;
    }

    currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, delta / speedTransitionDuration);

    let isMoving = false;
    let direction = new THREE.Vector3();

    // Handle movement in different directions
    if (keysPressed['z']) { // Move forward
        direction.z += currentSpeed * delta;
        isMoving = true;
    }
    if (keysPressed['s']) { // Move backward (only walking, no running)
        direction.z -= walkSpeed * delta; // Backward movement is restricted to walking speed, regardless of shift key
        isMoving = true;
    }
    if (keysPressed['q']) { // Strafe left
        direction.x += currentSpeed * delta;
        isMoving = true;
    }
    if (keysPressed['d']) { // Strafe right
        direction.x -= currentSpeed * delta;
        isMoving = true;
    }

    // Apply character rotation to movement direction
    direction.applyQuaternion(character.quaternion);

    // Move character if there are no collisions
    if (!checkCollisions(direction, collidableObjects, characterBoundingBox)) {
        character.position.add(direction);
    }

    characterBoundingBox.updateMatrixWorld();

    // Animation handling logic
    if (!isJumping) {
        let walkAction = animationsMap.get('walking'); // Assume 'walking' is the name of the walking animation

        if (isMoving) {
            if (keysPressed['z'] && keysPressed['shift']) { // Running forward
                setAction('running');
                if (walkAction) walkAction.timeScale = 1; // Normal forward playback speed
            } else if (keysPressed['s']) { // Walking backward (disable running, enforce walking)
                setAction('walking');
                if (walkAction) walkAction.timeScale = -1; // Reverse the walk animation
            } else { // Walking forward or strafing
                setAction('walking');
                if (walkAction) walkAction.timeScale = 1; // Normal forward playback
            }
        } else { // Not moving, set idle action
            setAction('idle');
            if (walkAction) walkAction.timeScale = 1; // Ensure animation is reset to forward speed for future use
        }
    }

    // Update the camera position relative to the character
    updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera);

    // Mana regeneration over time
    mana = Math.min(mana + manaRegenRate * delta, maxMana);
    updateMana(mana / maxMana);
}

export function initiateJump(character, mixer, animationsMap, setAction, isJumping, setIsJumping, keysPressed) {
    if (!isJumping && character) {
        setIsJumping(true);
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

export function initiatePunch(character, mixer, animationsMap, setAction, isJumping) {
    if (!isJumping && character) {
        setAction('punching');
    }
}

export function shootSpell(character, scene, collidableObjects, camera, verticalCorrection, shootSourceHeight, debugHelpers, activeSpell) {
    if (mana < spellCost) {
        console.warn('Not enough mana to cast spell.');
        return;
    }

    mana -= spellCost;

    let sphereGeometry, sphereMaterial, spellLight, spellSpeed, scale;

    if (activeSpell === 'blue') {
        sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, opacity: 0.5, transparent: true });
        spellSpeed = 10;
        scale = 1.5;
    } else if (activeSpell === 'yellow') {
        sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, opacity: 0.5, transparent: true });
        spellSpeed = 15;
        scale = 10;
    } else if (activeSpell === 'red') {
        sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
        spellSpeed = 20;
        scale = 2.0;
    }

    const spell = new THREE.Mesh(sphereGeometry, sphereMaterial);
    spell.layers.enable(BLOOM_SCENE);

    spellLight = new THREE.PointLight(sphereMaterial.color.getHex(), 1, 10);
    spell.add(spellLight);

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y += verticalCorrection;
    spell.position.copy(character.position).add(new THREE.Vector3(0, shootSourceHeight, 0)).add(forward.clone().multiplyScalar(1));
    spell.velocity = forward.clone().multiplyScalar(spellSpeed);

    scene.add(spell);

    const spellBoxHelper = new THREE.BoxHelper(spell, sphereMaterial.color.getHex());

    debugHelpers.push(spell);
    debugHelpers.push(spellBoxHelper);

    let collisionOccurred = false;
    let collisionTime = 0;
    const spellAnimation = (delta) => {
        if (!collisionOccurred) {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            spellBoxHelper.update();

            if (checkCollisions(spell.velocity.clone().multiplyScalar(delta), collidableObjects, spell)) {
                collisionOccurred = true;
                collisionTime = 0;
                spell.scale.set(scale, scale, scale);
                spellLight.intensity = 5;
            }
        } else {
            collisionTime += delta;
            const spellScale = scale * (1 - collisionTime / 0.5);
            spell.scale.set(spellScale, spellScale, spellScale);
            spellLight.intensity = 5 * (1 - collisionTime / 0.5);

            if (collisionTime >= 0.5) {
                scene.remove(spell);
                scene.remove(spellBoxHelper);
                return false;
            }
        }

        return true;
    };

    return spellAnimation;
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
