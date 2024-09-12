import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { adjustToGroundLevel } from './utils.js';
import { NavMesh } from './enemyNavigation.js';

const ENEMY_SPEED = 2;

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
            
            console.log(`Enemy loaded at position: ${this.mesh.position.x}, ${this.mesh.position.y}, ${this.mesh.position.z}`);
            
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
            
            const movement = new THREE.Vector3(
                direction.x * ENEMY_SPEED * delta,
                0,
                direction.z * ENEMY_SPEED * delta
            );
            
            const oldPosition = this.mesh.position.clone();
            this.mesh.position.add(movement);
            
            console.log(`Enemy ${this.type} moved from ${oldPosition.x.toFixed(2)}, ${oldPosition.z.toFixed(2)} to ${this.mesh.position.x.toFixed(2)}, ${this.mesh.position.z.toFixed(2)}`);
            console.log(`Current target: ${targetPosition.x.toFixed(2)}, ${targetPosition.z.toFixed(2)}, Distance: ${this.mesh.position.distanceTo(targetPosition).toFixed(2)}`);
    
            // Faire pivoter l'ennemi vers la direction du mouvement, mais seulement sur l'axe Y
            this.mesh.lookAt(new THREE.Vector3(
                this.mesh.position.x + direction.x,
                this.mesh.position.y,
                this.mesh.position.z + direction.z
            ));
    
            if (this.mesh.position.distanceTo(targetPosition) < 0.1) {
                console.log(`Reached waypoint ${this.currentPathIndex}`);
                this.currentPathIndex++;
                if (this.currentPathIndex >= this.path.length) {
                    console.log('Reached final waypoint, finding new target');
                    this.findNewTarget();
                }
            }
    
            this.setAction('walk');
        } else {
            this.setAction('idle');
        }
    }
    
    // Nouvelle méthode pour ajouter le helper de direction
    addDirectionHelper(direction) {
        const arrowHelper = new THREE.ArrowHelper(
            direction,
            this.mesh.position,
            2,
            0xff0000
        );
        this.scene.add(arrowHelper);
        setTimeout(() => this.scene.remove(arrowHelper), 100);
    }

    findNewTarget() {
        if (!this.navMesh || typeof this.navMesh.getRandomNode !== 'function') {
            console.warn('NavMesh not available or getRandomNode is not a function.');
            return;
        }
    
        const randomNode = this.navMesh.getRandomNode();
        if (!randomNode) {
            console.warn('No valid target found in NavMesh.');
            return;
        }
    
        this.targetPosition = randomNode.position.clone();
        this.targetPosition.y = this.mesh.position.y; // Garder la même hauteur
    
        if (typeof this.navMesh.findPath === 'function') {
            this.path = this.navMesh.findPath(this.mesh.position, this.targetPosition);
            if (this.path && Array.isArray(this.path)) {
                console.log(`New path generated with ${this.path.length} waypoints:`, this.path);
            } else {
                console.warn('Invalid path returned from findPath');
                this.path = [this.targetPosition];
            }
        } else {
            console.warn('NavMesh findPath is not a function. Using direct path.');
            this.path = [this.targetPosition];
        }
        this.currentPathIndex = 0;
    
        console.log(`New target set for ${this.type}: ${this.targetPosition.x.toFixed(2)}, ${this.targetPosition.z.toFixed(2)}`);
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
        console.log("Spawning enemy with NavMesh:", navMesh);
        if (!navMesh || !navMesh.nodes || navMesh.nodes.length === 0) {
            console.error("Invalid NavMesh provided to spawnEnemy");
            resolve(null);
            return;
        }

        const position = getRandomFreePosition(navMesh);
        if (!position) {
            console.warn('Could not find a free position for enemy spawn');
            resolve(null);
            return;
        }

        console.log(`Attempting to spawn enemy at: ${position.x}, ${position.y}, ${position.z}`);
        
        const enemyTypes = Object.keys(ENEMY_TYPES);
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        const enemy = new Enemy(scene, position, collidableObjects, randomType, navMesh);
        enemy.loadModel().then(() => {
            // Adjust enemy position to ground level
            adjustEnemyToGroundLevel(enemy, collidableObjects);
            console.log(`Successfully spawned ${randomType} enemy at: ${enemy.mesh.position.x}, ${enemy.mesh.position.y}, ${enemy.mesh.position.z}`);
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

    // Get all available nodes from the NavMesh
    const availableNodes = navMesh.nodes.filter(node => !node.occupied);

    if (availableNodes.length === 0) {
        console.warn('No free positions available in the NavMesh');
        return null;
    }

    // Select a random node from the available nodes
    const randomNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];

    // Mark the node as occupied
    randomNode.occupied = true;

    // Return the position of the selected node
    return randomNode.position;
}

function adjustEnemyToGroundLevel(enemy, collidableObjects) {
    const raycaster = new THREE.Raycaster();
    raycaster.ray.direction.set(0, -1, 0);
    raycaster.ray.origin.copy(enemy.mesh.position);
    raycaster.ray.origin.y += 50; // Start from high above

    const intersects = raycaster.intersectObjects(collidableObjects);
    if (intersects.length > 0) {
        enemy.mesh.position.y = intersects[0].point.y + enemy.mesh.scale.y / 2;
    }
}