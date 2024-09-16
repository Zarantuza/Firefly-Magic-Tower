// player.js
import * as THREE from 'three';
import { updateManaBar, updateFireflyCounter, updateSpellUI, updateSpellSelectionBar } from './ui.js';
import { getAvailableSpell, shootSpell } from './spells.js';

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
let fireflyCount = 1000;
let currentSpell = null;
let isPunching = false; // Variable pour suivre l'état du punch
let isJumping = false;  // Variable pour suivre l'état du saut
let isFalling = false;  // Nouvelle variable pour gérer la chute
const punchRange = 1.5; // Portée du punch en unités de votre scène
const punchDamage = 10; // Dégâts infligés par le punch

export function setIsPunching(state) {
    isPunching = state;
}

export function setIsJumping(state) {
    isJumping = state;
}

export function setIsFalling(state) {
    isFalling = state;
}

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
    }

    getSpeed(isRunning) {
        this.updateSpeed();
        return isRunning ? this.currentRunSpeed : this.currentWalkSpeed;
    }
}

export function resetJump() {
    canJump = true;
}

export const player = new Player();

// Nouvelle fonction pour vérifier si le personnage est au sol
function isOnGround(character, collidableObjects) {
    const raycaster = new THREE.Raycaster(
        character.position.clone(),
        new THREE.Vector3(0, -1, 0),
        0,
        0.1 // Distance pour considérer que le personnage est au sol
    );
    const intersects = raycaster.intersectObjects(collidableObjects, true);
    return intersects.length > 0;
}

export function handlePlayerMovement(
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
) {
    if (!character || !characterBoundingBox) return;

    // Empêcher le mouvement si on est en train de puncher
    if (isPunching) {
        updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera);
        return;
    }

    // Gestion de la gravité et du saut
    if (isJumping || velocityY !== 0) {
        velocityY += gravity * delta;
        const verticalMove = new THREE.Vector3(0, velocityY * delta, 0);

        if (!checkCollisions(verticalMove, collidableObjects, characterBoundingBox)) {
            character.position.y += verticalMove.y;
            // Déterminer si le personnage est en train de tomber
            if (velocityY < 0) {
                isFalling = true;
            }
        } else {
            if (velocityY < 0) {
                // Le personnage a atterri
                setIsJumping(false);
                isFalling = false;
                velocityY = 0;
                resetJump();

                // Déterminer l'action suivante
                if (keysPressed['z'] || keysPressed['q'] || keysPressed['s'] || keysPressed['d']) {
                    setAction('walking');
                } else {
                    setAction('idle');
                }
            } else {
                velocityY = 0;
            }
        }
        console.log('isPunching:', isPunching, 'isJumping:', isJumping, 'keysPressed:', keysPressed);

    }

    // Déterminer si le personnage court
    const isRunning = keysPressed['z'] && keysPressed['shift'];

    // Obtenir la vitesse appropriée
    let targetSpeed = player.getSpeed(isRunning);

    currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, delta / speedTransitionDuration);

    let isMoving = false;
    let direction = new THREE.Vector3();

    // Gérer le mouvement dans différentes directions
    // Si vous souhaitez empêcher le mouvement horizontal pendant le saut, décommentez la condition suivante
    // if (!isJumping && !isFalling) {
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
    // }

    direction.applyQuaternion(character.quaternion);

    if (!checkCollisions(direction, collidableObjects, characterBoundingBox)) {
        character.position.add(direction);
    }

    characterBoundingBox.updateMatrixWorld();

    // Gestion des animations
    if (!isPunching) {
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
        } else if (!isJumping && !isFalling) {
            setAction('idle');
        }
    }

    updateCameraPosition(character, cameraPitch, cameraDistance, collidableObjects, camera);

    // Régénération de mana au fil du temps
    mana = Math.min(mana + manaRegenRate * delta, maxMana);
    updateManaBar(document.getElementById('manaBar'), mana / maxMana);
}

export function initiateJump(character, mixer, animationsMap, setAction, isJumping, isPunching, setIsJumping, keysPressed, collidableObjects) {
    if (!isJumping && !isPunching && canJump && character) {
        setIsJumping(true);
        canJump = false;
        velocityY = jumpStrength;
        setAction('jumping');

        const jumpAction = animationsMap.get('jumping');
        if (jumpAction) {
            jumpAction.reset();
            jumpAction.clampWhenFinished = true;
            jumpAction.setLoop(THREE.LoopOnce);
            jumpAction.play();

            const onJumpFinished = (e) => {
                if (e.action === jumpAction) {
                    mixer.removeEventListener('finished', onJumpFinished);
                    // On ne remet pas isJumping à false ici car le personnage peut être encore en l'air
                }
            };

            mixer.addEventListener('finished', onJumpFinished);
        }
    }
}

// player.js
export function initiatePunch(
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
    scene // Ajouter le paramètre scene
) {
    // Vérifier que le personnage est bien au sol
    const onGround = isOnGround(character, collidableObjects);

    if (!isJumping && !isPunching && onGround && character) {
        setIsPunching(true);
        setAction('punching');

        const punchingAction = animationsMap.get('punching');
        if (punchingAction) {
            punchingAction.reset();
            punchingAction.clampWhenFinished = true;
            punchingAction.setLoop(THREE.LoopOnce);
            punchingAction.play();

            // Moment où le punch atteint sa cible (en secondes)
            const punchImpactTime = punchingAction.getClip().duration * 0.5; // Ajustez le pourcentage selon votre animation

            // Utiliser un délai pour appliquer les dégâts au bon moment
            setTimeout(() => {
                applyPunchDamage(character, enemies, scene);
            }, punchImpactTime * 1000);

            const onPunchFinished = (e) => {
                if (e.action === punchingAction) {
                    mixer.removeEventListener('finished', onPunchFinished);
                    setIsPunching(false);

                    // Déterminer l'action suivante
                    if (keysPressed['z'] || keysPressed['q'] || keysPressed['s'] || keysPressed['d']) {
                        setAction('walking');
                    } else {
                        setAction('idle');
                    }
                }
            };

            mixer.addEventListener('finished', onPunchFinished);
        }
    }
}

// player.js
function applyPunchDamage(character, enemies, scene) {
    // Position du personnage
    const characterPosition = character.position.clone();

    // Créer une sphère autour du personnage pour détecter les ennemis à portée
    const punchArea = new THREE.Sphere(characterPosition, punchRange);

    enemies.forEach((enemy) => {
        if (enemy && enemy.mesh) {
            const enemyPosition = enemy.mesh.position.clone();
            // Vérifier si l'ennemi est dans la portée du punch
            if (punchArea.containsPoint(enemyPosition)) {
                // Infliger des dégâts à l'ennemi
                enemy.takeDamage(punchDamage);

                // Créer l'effet d'impact à la position de l'ennemi
                createImpactEffect(enemyPosition, scene);
            }
        }
    });
}


function createImpactEffect(position, scene) {
    const impactGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const impactMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        transparent: true,
        opacity: 1
    });
    const impactMesh = new THREE.Mesh(impactGeometry, impactMaterial);
    
    impactMesh.position.copy(position);
    impactMesh.position.y += 0.5;
    scene.add(impactMesh);

    // Animation pour faire disparaître l'effet
    const duration = 0.3; // Durée de l'effet en secondes
    const startTime = performance.now();

    function animate() {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed < duration) {
            const scale = 1 + elapsed * 2; // Agrandir l'effet
            impactMesh.scale.set(scale, scale, scale);
            impactMesh.material.opacity = 1 - (elapsed / duration); // Diminuer l'opacité
            requestAnimationFrame(animate);
        } else {
            scene.remove(impactMesh);
            impactMesh.geometry.dispose();
            impactMesh.material.dispose();
        }
    }
    animate();
}




export function castSpell(
    character,
    scene,
    collidableObjects,
    camera,
    verticalCorrection,
    shootSourceHeight,
    debugHelpers,
    fireflyCount,
    spell,
    enemies
) {
    if (!spell) {
        return null;
    }

    if (mana < spell.cost) {
        return null;
    }

    mana -= spell.cost;
    updateManaBar(document.getElementById('manaBar'), mana / maxMana);

    return shootSpell(
        character,
        scene,
        collidableObjects,
        camera,
        verticalCorrection,
        shootSourceHeight,
        debugHelpers,
        fireflyCount,
        spell,
        enemies
    );
}

export function updateCameraPosition(
    character,
    cameraPitch,
    cameraDistance,
    collidableObjects,
    camera
) {
    if (!character || !camera) return;

    const offset = new THREE.Vector3(0, 3, -cameraDistance);
    offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch);

    const desiredCameraPosition = character.position
        .clone()
        .add(offset.applyQuaternion(character.quaternion));
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

export function increaseMana(amount) {
    setMana(Math.min(getMana() + amount, getMaxMana()));
}

export function addFirefly() {
    fireflyCount += 1;
    updateFireflyCounter(fireflyCount);
    currentSpell = getAvailableSpell(fireflyCount);
    updateSpellUI(currentSpell, fireflyCount);
    updateSpellSelectionBar(fireflyCount);
}

export function getFireflyCount() {
    return fireflyCount;
}

export function setFireflyCount(count) {
    fireflyCount = count;
    updateFireflyCounter(fireflyCount);
    currentSpell = getAvailableSpell(fireflyCount);
    updateSpellUI(currentSpell, fireflyCount);
    updateSpellSelectionBar(fireflyCount);
}
