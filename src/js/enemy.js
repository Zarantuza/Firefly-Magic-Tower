// enemy.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { adjustToGroundLevel } from './utils.js';
import { NavMesh } from './enemyNavigation.js';

const ENEMY_SPEED = 2;
const MINIMUM_SPAWN_DISTANCE = 10; // Minimum distance from player
const MINIMUM_ENEMY_DISTANCE = 5;

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
        this.path = [];
        this.currentPathIndex = 0;
        this.isDead = false; // Nouvelle propriété pour suivre l'état de l'ennemi
    }

    async loadModel() {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load('/glb/goblin.glb', (gltf) => {
                this.mesh = gltf.scene;
                this.mesh.position.copy(this.position);
                this.mesh.scale.set(this.scale, this.scale, this.scale);

                // Ajout de la rotation initiale pour orienter correctement le modèle
                this.mesh.rotation.x = 0;
                this.mesh.rotation.y = Math.PI; // Ajustez cette valeur si nécessaire
                this.mesh.rotation.z = 0;

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

                // Ajustement de la position Y et appel à adjustToGroundLevel
                this.mesh.position.y = 1; // Ajustez cette valeur selon la hauteur du sol
                adjustToGroundLevel(this.mesh, this.collidableObjects);

                // Trouver une nouvelle cible pour le déplacement
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
        if (!this.isLoaded || !this.mesh || this.isDead) return;

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

            // Vérification de collision améliorée
            if (!this.checkCollision(movement)) {
                this.mesh.position.add(movement);

                // Rotation plus fluide
                const lookAtPosition = this.mesh.position.clone().add(direction);
                this.mesh.lookAt(lookAtPosition);

                if (this.mesh.position.distanceTo(targetPosition) < 0.1) {
                    this.currentPathIndex++;
                }

                this.setAction('walk');
            } else {
                // En cas de collision, chercher une nouvelle cible
                
                this.findNewTarget();
            }
        } else {
            this.setAction('idle');
        }
    }

    checkCollision(movement) {
        const raycaster = new THREE.Raycaster(this.mesh.position, movement.clone().normalize(), 0, movement.length());
        const intersects = raycaster.intersectObjects(this.collidableObjects);
        return intersects.length > 0;
    }

    findNewTarget() {
        if (!this.navMesh || typeof this.navMesh.getRandomNode !== 'function') {
            return;
        }

        const randomNode = this.navMesh.getRandomNode();
        if (!randomNode) {
            return;
        }

        this.targetPosition = randomNode.position.clone();
        this.targetPosition.y = this.mesh.position.y; // Garder la même hauteur

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
        }
    }

    die() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        this.isDead = true; // Marquer l'ennemi comme mort
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
        const enemyTypes = Object.keys(ENEMY_TYPES);
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        const enemy = new Enemy(scene, position, collidableObjects, randomType, navMesh);
        enemy.loadModel().then(() => {
            adjustEnemyToGroundLevel(enemy, collidableObjects);
            resolve(enemy);
        }).catch((error) => {
            console.error('Error spawning enemy:', error);
            resolve(null);
        });
    });
}

function getRandomFreePosition(navMesh) {
    if (!navMesh || !navMesh.nodes || navMesh.nodes.length === 0) {
        console.warn('NavMesh is not properly initialized');
        return null;
    }

    // Obtenir tous les nœuds disponibles du NavMesh
    const availableNodes = navMesh.nodes.filter(node => !node.occupied);

    if (availableNodes.length === 0) {
        console.warn('No free positions available in the NavMesh');
        return null;
    }

    // Sélectionner un nœud aléatoire parmi les nœuds disponibles
    const randomNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];

    // Marquer le nœud comme occupé
    randomNode.occupied = true;

    // Retourner la position du nœud sélectionné
    return randomNode.position;
}

function adjustEnemyToGroundLevel(enemy, collidableObjects) {
    const raycaster = new THREE.Raycaster();
    raycaster.ray.direction.set(0, -1, 0);
    raycaster.ray.origin.copy(enemy.mesh.position);
    raycaster.ray.origin.y += 50; // Commencer à une hauteur élevée

    const intersects = raycaster.intersectObjects(collidableObjects);
    if (intersects.length > 0) {
        enemy.mesh.position.y = intersects[0].point.y + enemy.mesh.scale.y / 2;
    }
}
