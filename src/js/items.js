import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { addFirefly } from './game.js';

export const ITEM_TYPES = {
    SMALL_LIFE_POTION: { 
        model: '/glb/life-small-potion.glb',
        effect: (player) => { 
            //console.log("Healing player for 20");
            if (typeof player.heal === 'function') player.heal(20);
        },
        // Custom material is now optional
        // material: { color: 0xff0000, metalness: 0.7, roughness: 0.3 },
        height: 1.5,
        rotationSpeed: 0.01
    },
    BIG_LIFE_POTION: { 
        model: '/glb/life-small-potion.glb',
        effect: (player) => {
            //console.log("Healing player for 50");
            if (typeof player.heal === 'function') player.heal(50);
        },
        height: 1.7,
        rotationSpeed: 0.015
    },
    SMALL_MANA_POTION: { 
        model: '/glb/Mana_small_Potion.glb',
        effect: (player) => {
            //console.log("Increasing player mana by 20");
            if (typeof player.increaseMana === 'function') player.increaseMana(20);
        },
        height: 1.4,
        rotationSpeed: 0.012
    },
    BIG_MANA_POTION: { 
        model: '/glb/Mana_small_Potion.glb',
        effect: (player) => {
            //console.log("Increasing player mana by 50");
            if (typeof player.increaseMana === 'function') player.increaseMana(50);
        },
        height: 1.6,
        rotationSpeed: 0.018
    },
    SMALL_SPEED_POTION: { 
        model: '/glb/speed-potion.glb',
        effect: (player) => {
            //console.log("Increasing player speed by 1.2 for 10 seconds");
            if (typeof player.increaseSpeed === 'function') player.increaseSpeed(1.2, 10);
        },
        height: 1.3,
        rotationSpeed: 0.02
    },
    BIG_SPEED_POTION: { 
        model: '/glb/speed-potion.glb',
        effect: (player) => {
            //console.log("Increasing player speed by 1.5 for 15 seconds");
            if (typeof player.increaseSpeed === 'function') player.increaseSpeed(1.5, 15);
        },
        height: 1.5,
        rotationSpeed: 0.025
    },
    FIREFLY: { 
        model: '/glb/firefly.glb',
        effect: (player) => {
            console.log("Player collected a firefly");
            if (typeof player.addFirefly === 'function') {
                player.addFirefly();
            } else {
                console.warn("player.addFirefly is not a function");
            }
        },
        material: { emissive: 0xffff00, emissiveIntensity: 5 },
        emissiveMap: '/textures/firefly.PNG',
        height: 1.8,
        rotationSpeed: 0.01
    }
};

const loader = new GLTFLoader();

export function loadItemModel(itemType, scene, collidableObjects, x, z, player) {
    const itemData = ITEM_TYPES[itemType];
    if (!itemData) {
        //console.error(`Unknown item type: ${itemType}`);
        return;
    }

    loader.load(itemData.model, (gltf) => {
        const item = gltf.scene;
        item.name = `${itemType}_${x}_${z}`;
        item.scale.set(0.25, 0.25, 0.25);
        item.position.set(x, itemData.height, z);

        item.traverse((child) => {
            if (child.isMesh) {
                // Use default material if no custom material is specified
                if (itemData.material) {
                    child.material = new THREE.MeshStandardMaterial(itemData.material);
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Add rotation animation
        const rotationSpeed = itemData.rotationSpeed;
        function animate() {
            item.rotation.y += rotationSpeed;
            requestAnimationFrame(animate);
        }
        animate();

        item.userData = {
            type: itemType,
            isCollectible: true,
            isCollected: false,
            collect: function () {
                if (!this.isCollected) {
                    this.isCollected = true;
                    itemData.effect(player);
                    scene.remove(item);
                    collidableObjects.splice(collidableObjects.indexOf(item), 1);
                    //console.log(`${itemType} collected and removed from scene.`);
                }
            }
        };

        collidableObjects.push(item);
        scene.add(item);
        //console.log(`${itemType} added to scene at position (${x}, ${itemData.height}, ${z})`);
    }, undefined, (error) => {
        //console.error(`Error loading model for ${itemType}:`, error);
    });
}

export function placeItems(scene, collidableObjects, player, config, getRandomPosition) {
    //console.log("Starting to place items...");

    Object.entries(ITEM_TYPES).forEach(([itemType, itemData]) => {
        const count = itemType === 'FIREFLY' ? config.numFireflies : (config.potions[itemType] || 0);
        //console.log(`Attempting to place ${count} ${itemType}`);

        for (let i = 0; i < count; i++) {
            const { x, z } = getRandomPosition();
            if (x === null || z === null) {
                //console.warn(`Could not place ${itemType} due to lack of free space`);
                continue;
            }
            //console.log(`Placing ${itemType} at position (${x}, ${z})`);
            loadItemModel(itemType, scene, collidableObjects, x, z, player);
        }
    });

    //console.log("Finished placing items.");
}