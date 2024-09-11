import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { adjustToGroundLevel } from './utils.js';
import { NavMesh } from './enemyNavigation.js';

const ENEMY_SPEED = 0.5;

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
        this.mixer = null;
        this.animationsMap = new Map();
        this.currentAction = '';
        this.targetPosition = null;
        this.isLoaded = false;
        this.navMesh = navMesh;
        this.path = null;
        this.currentPathIndex = 0;
    }

    async loadModel() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load('/glb/goblin.glb', (gltf) => {
                this.mesh = gltf.scene;
                this.mesh.position.copy(this.position);
                this.mesh.scale.set(this.scale, this.scale, this.scale);

                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.material = child.material.clone();
                        child.material.color.setHex(ENEMY_TYPES[this.type].color);
                    }
                });

                this.scene.add(this.mesh);

                this.mixer = new THREE.AnimationMixer(this.mesh);

                gltf.animations.forEach((clip) => {
                    const action = this.mixer.clipAction(clip);
                    this.animationsMap.set(clip.name.toLowerCase(), action);
                });

                this.setAction('idle');
                this.isLoaded = true;
                adjustToGroundLevel(this.mesh, this.collidableObjects);
                this.findNewTarget();
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
        }
    }

    update(delta) {
        if (!this.isLoaded || !this.mesh) return;

        if (this.mixer) {
            this.mixer.update(delta);
        }

        if (!this.path || this.currentPathIndex >= this.path.length) {
            this.findNewTarget();
        }

        if (this.path && this.currentPathIndex < this.path.length) {
            const targetPosition = this.path[this.currentPathIndex];
            const direction = new THREE.Vector3().subVectors(targetPosition, this.mesh.position).normalize();
            const movement = direction.multiplyScalar(ENEMY_SPEED * delta);
            this.mesh.position.add(movement);

            this.mesh.lookAt(this.mesh.position.clone().add(direction));

            if (this.mesh.position.distanceTo(targetPosition) < 0.1) {
                this.currentPathIndex++;
            }

            this.setAction('walk');
        } else {
            this.setAction('idle');
        }
    }

    findNewTarget() {
        const randomX = Math.floor(Math.random() * 4) * 10 + 5;
        const randomZ = Math.floor(Math.random() * 4) * 10 + 5;
        this.targetPosition = new THREE.Vector3(randomX, this.mesh.position.y, randomZ);
        
        if (this.navMesh && typeof this.navMesh.findPath === 'function') {
            this.path = this.navMesh.findPath(this.mesh.position, this.targetPosition);
        } else {
            console.warn('NavMesh not available or findPath is not a function. Using direct path.');
            this.path = [this.targetPosition];
        }
        this.currentPathIndex = 0;
    }

    takeDamage(amount) {
        this.health -= amount;
        console.log(`Enemy ${this.type} took ${amount} damage. Remaining health: ${this.health}`);
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}

export function spawnEnemy(scene, collidableObjects, navMesh) {
    return new Promise((resolve, reject) => {
        const cellSize = 10;
        const gridSize = 4;

        const randomX = Math.floor(Math.random() * gridSize) * cellSize + cellSize / 2;
        const randomZ = Math.floor(Math.random() * gridSize) * cellSize + cellSize / 2;
        const position = new THREE.Vector3(randomX, 1.05, randomZ);

        const enemyTypes = Object.keys(ENEMY_TYPES);
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        console.log(`Attempting to spawn ${randomType} enemy at: ${position.toString()}`);
        
        const enemy = new Enemy(scene, position, collidableObjects, randomType, navMesh);
        enemy.loadModel().then(() => {
            console.log(`Successfully spawned ${randomType} enemy at: ${position.toString()}`);
            resolve(enemy);
        }).catch((error) => {
            console.error('Error spawning enemy:', error);
            resolve(null);
        });
    });
}