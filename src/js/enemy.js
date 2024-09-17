import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { adjustToGroundLevel } from './utils.js';
import { NavMesh } from './enemyNavigation.js';
import { takeDamage } from './player.js';  // Importez la fonction takeDamage



const ENEMY_SPEED = 1;
const ENEMY_RUN_SPEED = 2;
const MINIMUM_SPAWN_DISTANCE = 10;
const MINIMUM_ENEMY_DISTANCE = 5;
const CHASE_DISTANCE = 10;
const ATTACK_DISTANCE = 1.5;
const ATTACK_COOLDOWN = 3; // seconds
let enemiesKilled = 0;

const ENEMY_TYPES = {
    BASIC: {
        health: 100,
        damage: 10,
        color: 0xff0000,
        scale: 0.6
    },
    TANK: {
        health: 200,
        damage: 5,
        color: 0x0000ff,
        scale: 0.8
    },
    FAST: {
        health: 50,
        damage: 15,
        color: 0x00ff00,
        scale: 0.5
    }
};

export class Enemy {
    constructor(scene, position, collidableObjects, type = 'BASIC', navMesh) {
        this.scene = scene;
        this.position = position;
        this.collidableObjects = collidableObjects;
        this.type = type;
        this.health = ENEMY_TYPES[type].health;
        this.damage = ENEMY_TYPES[type].damage;
        this.scale = ENEMY_TYPES[type].scale;
        this.mesh = null;
        this.animationMixer = null;
        this.currentAction = null;
        this.animationsMap = new Map();
        this.targetPosition = null;
        this.isLoaded = false;
        this.navMesh = navMesh;
        this.path = [];
        this.currentPathIndex = 0;
        this.isDead = false;
        this.isChasing = false;
        this.isAttacking = false;
        this.lastAttackTime = 0;
    }

    async loadModel() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load('/glb/goblin.glb', (gltf) => {
                this.mesh = gltf.scene;
                this.mesh.position.copy(this.position);
                this.mesh.scale.set(this.scale, this.scale, this.scale);

                this.mesh.rotation.x = 0;
                this.mesh.rotation.y = Math.PI;
                this.mesh.rotation.z = 0;

                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.material = child.material.clone();
                        child.material.color.setHex(ENEMY_TYPES[this.type].color);
                    }
                });

                this.scene.add(this.mesh);

                this.animationMixer = new THREE.AnimationMixer(this.mesh);

                gltf.animations.forEach((clip) => {
                    const action = this.animationMixer.clipAction(clip);
                    this.animationsMap.set(clip.name.toLowerCase(), action);
                });

                if (this.animationsMap.has('idle')) {
                    this.setAction('idle');
                } else if (gltf.animations.length > 0) {
                    this.currentAction = this.animationMixer.clipAction(gltf.animations[0]);
                    this.currentAction.play();
                }

                this.isLoaded = true;

                this.mesh.position.y = 1;
                adjustToGroundLevel(this.mesh, this.collidableObjects);

                this.findNewTarget();
                console.log(`Enemy of type ${this.type} loaded at position:`, this.mesh.position);
                resolve(this);
            }, undefined, (error) => {
                console.error('An error happened while loading the enemy model:', error);
                reject(error);
            });
        });
    }

    setAction(actionName) {
        if (this.currentAction === actionName) return;

        const action = this.animationsMap.get(actionName);
        if (action) {
            const previousAction = this.animationsMap.get(this.currentAction);
            action.reset().fadeIn(0.5).play();
            if (previousAction) {
                previousAction.fadeOut(0.5);
            }
            this.currentAction = actionName;
            console.log(`Enemy action set to: ${actionName}`);
        }
    }

    update(delta, playerPosition, player) {
        if (!this.isLoaded || !this.mesh || this.isDead || !playerPosition) return;

        if (this.animationMixer) {
            this.animationMixer.update(delta);
        }

        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

        if (distanceToPlayer <= ATTACK_DISTANCE) {
            this.attack(delta, player);  // Passez 'player' ici
            this.attack(delta);
        } else if (distanceToPlayer <= CHASE_DISTANCE) {
            this.chase(playerPosition, delta);
        } else {
            this.patrol(delta);
        }
    }

    patrol(delta) {
        if (!this.path || this.currentPathIndex >= this.path.length) {
            this.findNewTarget();
        }

        if (this.path && this.currentPathIndex < this.path.length) {
            const targetPosition = this.path[this.currentPathIndex];
            const direction = new THREE.Vector3().subVectors(targetPosition, this.mesh.position).normalize();
            const movement = direction.multiplyScalar(ENEMY_SPEED * delta);

            if (!this.checkCollision(movement)) {
                this.mesh.position.add(movement);
                this.mesh.lookAt(targetPosition);

                if (this.mesh.position.distanceTo(targetPosition) < 0.1) {
                    this.currentPathIndex++;
                }

                this.setAction('walk');
            } else {
                this.findNewTarget();
            }
        } else {
            this.setAction('idle');
        }
    }

    chase(playerPosition, delta) {
        const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
        const movement = direction.multiplyScalar(ENEMY_RUN_SPEED * delta);

        if (!this.checkCollision(movement)) {
            this.mesh.position.add(movement);
            this.mesh.lookAt(playerPosition);
            this.setAction('run');
        } else {
            this.setAction('idle');
        }
    }

    attack(delta, player) {
        const currentTime = performance.now() / 1000;
    
        // Always check if the cooldown has passed, regardless of `isAttacking` state
        if (currentTime - this.lastAttackTime >= ATTACK_COOLDOWN) {
            // Reset `isAttacking` to allow a new attack
            this.isAttacking = false;
        }
    
        // Proceed with attack only if not currently attacking
        if (!this.isAttacking) {
            this.isAttacking = true;
            this.lastAttackTime = currentTime;
    
            this.setAction('attack'); // Play attack animation
    
            // Listen for the attack animation finish event
            const attackAction = this.animationsMap.get('attack');
            if (attackAction) {
                attackAction.reset().play();
                attackAction.clampWhenFinished = true;
                attackAction.setLoop(THREE.LoopOnce);
    
                // Trigger damage during the animation
                const attackDuration = attackAction.getClip().duration * 0.5; // Deal damage halfway through the attack animation
                setTimeout(() => {
                    if (player && typeof player.takeDamage === 'function') {
                        player.takeDamage(this.damage);  // Ensure player has takeDamage method
                        console.log(`Enemy attacks for ${this.damage} damage`);
                    } else {
                        console.error("Player object does not have a takeDamage method");
                    }
                }, attackDuration * 1000);
    
                // Reset the attack state after the animation finishes
                attackAction.getMixer().addEventListener('finished', (event) => {
                    if (event.action === attackAction) {
                        this.isAttacking = false; // Allow the enemy to move again after attack animation finishes
                    }
                });
            }
        }
    }
    
    
    

    checkCollision(movement) {
        const raycaster = new THREE.Raycaster(this.mesh.position, movement.clone().normalize(), 0, movement.length());
        const intersects = raycaster.intersectObjects(this.collidableObjects);
        return intersects.length > 0;
    }

    findNewTarget() {
        if (!this.navMesh || typeof this.navMesh.getRandomNode !== 'function') {
            console.warn('NavMesh is not properly initialized for enemy');
            return;
        }

        const randomNode = this.navMesh.getRandomNode();
        if (!randomNode) {
            console.warn('No valid target found for enemy');
            return;
        }

        this.targetPosition = randomNode.position.clone();
        this.targetPosition.y = this.mesh.position.y;

        if (typeof this.navMesh.findPath === 'function') {
            this.path = this.navMesh.findPath(this.mesh.position, this.targetPosition);
            if (!this.path || !Array.isArray(this.path)) {
                this.path = [this.targetPosition];
            }
        } else {
            this.path = [this.targetPosition];
        }
        this.currentPathIndex = 0;
    }

    takeDamage(amount) {
        this.health -= amount;
        console.log(`Enemy ${this.type} took ${amount} damage. Remaining health: ${this.health}`);
        if (this.health <= 0) {
            this.health = 0;
            this.die();
            enemiesKilled += 1
        }
    }

    die() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        this.isDead = true;
        console.log(`Enemy ${this.type} has died`);
    }
}

export function spawnEnemy(scene, collidableObjects, navMesh) {
    return new Promise((resolve, reject) => {
        const randomNode = navMesh.getRandomNode();
        if (!randomNode) {
            console.warn('No available spawn positions');
            resolve(null);
            return;
        }

        const position = randomNode.position.clone();
        position.y = 1; // Manually set the Y position here (change 3 to your desired height)
        const enemyTypes = Object.keys(ENEMY_TYPES);
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        console.log(`Spawning ${randomType} enemy at position:`, position);

        const enemy = new Enemy(scene, position, collidableObjects, randomType, navMesh);
        enemy.loadModel().then(() => {
            // You might want to comment out this line to keep the manual Y position
            // adjustEnemyToGroundLevel(enemy, collidableObjects);
            console.log(`Enemy ${randomType} spawned and adjusted at position:`, enemy.mesh.position);
            resolve(enemy);
        }).catch((error) => {
            console.error('Error spawning enemy:', error);
            resolve(null);
        });
    });
}

function adjustEnemyToGroundLevel(enemy, collidableObjects) {
    if (!enemy.mesh) return;

    const raycaster = new THREE.Raycaster(
        enemy.mesh.position.clone().add(new THREE.Vector3(0, 50, 0)),
        new THREE.Vector3(0, -1, 0)
    );
    const intersects = raycaster.intersectObjects(collidableObjects);
    if (intersects.length > 0) {
        enemy.mesh.position.y = intersects[0].point.y + enemy.mesh.scale.y / 2;
    }
    console.log(`Enemy adjusted to Y position: ${enemy.mesh.position.y}`);
}
