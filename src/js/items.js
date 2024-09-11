// items.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

export const ITEM_TYPES = {
    SMALL_LIFE_POTION: { 
        model: '/glb/life-small-potion.glb',
        effect: (player) => { 
            console.log("Healing player for 20");
            if (typeof player.heal === 'function') player.heal(20);
        }
    },
    BIG_LIFE_POTION: { 
        model: '/glb/life-small-potion.glb',
        effect: (player) => {
            console.log("Healing player for 50");
            if (typeof player.heal === 'function') player.heal(50);
        }
    },
    SMALL_MANA_POTION: { 
        model: '/glb/Mana_small_Potion.glb',
        effect: (player) => {
            console.log("Increasing player mana by 20");
            if (typeof player.increaseMana === 'function') player.increaseMana(20);
        }
    },
    BIG_MANA_POTION: { 
        model: '/glb/Mana_small_Potion.glb',
        effect: (player) => {
            console.log("Increasing player mana by 50");
            if (typeof player.increaseMana === 'function') player.increaseMana(50);
        }
    },
    SMALL_SPEED_POTION: { 
        model: '/glb/speed-potion.glb',
        effect: (player) => {
            console.log("Increasing player speed by 1.2 for 10 seconds");
            if (typeof player.increaseSpeed === 'function') player.increaseSpeed(1.2, 10);
        }
    },
    BIG_SPEED_POTION: { 
        model: '/glb/speed-potion.glb',
        effect: (player) => {
            console.log("Increasing player speed by 1.5 for 15 seconds");
            if (typeof player.increaseSpeed === 'function') player.increaseSpeed(1.5, 15);
        }
    },
    FIREFLY: { 
        model: '/glb/book.glb',
        effect: (player) => {
            console.log("Player collected a firefly");
            if (typeof player.collectFirefly === 'function') player.collectFirefly();
        }
    }
};

const loader = new GLTFLoader();

export function loadItemModel(itemType, scene, collidableObjects, x, z, player) {
    const itemData = ITEM_TYPES[itemType];
    if (!itemData) {
        console.error(`Unknown item type: ${itemType}`);
        return;
    }

    loader.load(itemData.model, (gltf) => {
        const item = gltf.scene;
        item.name = `${itemType}_${x}_${z}`;
        item.scale.set(0.25, 0.25, 0.25);
        item.position.set(x, 1.5, z);

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
                    console.log(`${itemType} collected and removed from scene.`);
                }
            }
        };

        collidableObjects.push(item);
        scene.add(item);
        console.log(`${itemType} added to scene at position (${x}, ${z})`);
    }, undefined, (error) => {
        console.error(`Error loading model for ${itemType}:`, error);
    });
}

export function placeItems(scene, collidableObjects, player, config, getRandomPosition) {
    console.log("Starting to place items...");

    Object.entries(ITEM_TYPES).forEach(([itemType, itemData]) => {
        const count = itemType === 'FIREFLY' ? config.numFireflies : (config.potions[itemType] || 0);
        console.log(`Attempting to place ${count} ${itemType}`);

        for (let i = 0; i < count; i++) {
            const { x, z } = getRandomPosition();
            if (x === null || z === null) {
                console.warn(`Could not place ${itemType} due to lack of free space`);
                continue;
            }
            console.log(`Placing ${itemType} at position (${x}, ${z})`);
            loadItemModel(itemType, scene, collidableObjects, x, z, player);
        }
    });

    console.log("Finished placing items.");
}