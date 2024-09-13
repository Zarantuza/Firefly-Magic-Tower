// items.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { increaseMana, addFirefly } from './player.js'; // Importez depuis player.js au lieu de game.js

export const ITEM_TYPES = {
    SMALL_LIFE_POTION: { 
        model: '/glb/life-small-potion.glb',
        effect: (playerInstance) => { 
            if (typeof playerInstance.heal === 'function') playerInstance.heal(20);
        },
        height: 1.5,
        rotationSpeed: 0.01
    },
    BIG_LIFE_POTION: { 
        model: '/glb/life-small-potion.glb',
        effect: (playerInstance) => {
            if (typeof playerInstance.heal === 'function') playerInstance.heal(50);
        },
        height: 1.7,
        rotationSpeed: 0.015
    },
    SMALL_MANA_POTION: { 
        model: '/glb/Mana_small_Potion.glb',
        effect: () => {
            increaseMana(20);
        },
        height: 1.4,
        rotationSpeed: 0.012
    },
    BIG_MANA_POTION: { 
        model: '/glb/Mana_small_Potion.glb',
        effect: () => {
            increaseMana(50);
        },
        height: 1.6,
        rotationSpeed: 0.018
    },
    SMALL_SPEED_POTION: { 
        model: '/glb/speed-potion.glb',
        effect: (playerInstance) => {
            if (typeof playerInstance.increaseSpeed === 'function') playerInstance.increaseSpeed(1.2, 10);
        },
        height: 1.3,
        rotationSpeed: 0.02
    },
    BIG_SPEED_POTION: { 
        model: '/glb/speed-potion.glb',
        effect: (playerInstance) => {
            if (typeof playerInstance.increaseSpeed === 'function') playerInstance.increaseSpeed(1.5, 15);
        },
        height: 1.5,
        rotationSpeed: 0.025
    },
    FIREFLY: { 
        model: '/glb/firefly.glb',
        effect: () => {
            addFirefly();
        },
        material: { emissive: 0xffff00, emissiveIntensity: 5 },
        emissiveMap: '/textures/firefly.PNG',
        height: 1.8,
        rotationSpeed: 0.01
    }
};

const loader = new GLTFLoader();

export function loadItemModel(itemType, scene, collidableObjects, x, z, playerInstance) {
    const itemData = ITEM_TYPES[itemType];
    if (!itemData) {
        console.error(`Unknown item type: ${itemType}`);
        return;
    }

    loader.load(itemData.model, (gltf) => {
        const item = gltf.scene;
        item.name = `${itemType}_${x}_${z}`;
        item.scale.set(0.25, 0.25, 0.25);
        item.position.set(x, itemData.height, z);

        item.traverse((child) => {
            if (child.isMesh) {
                if (itemData.material) {
                    child.material = new THREE.MeshStandardMaterial(itemData.material);
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Ajouter l'animation de rotation
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
                    itemData.effect(playerInstance);
                    scene.remove(item);
                    collidableObjects.splice(collidableObjects.indexOf(item), 1);
                }
            }
        };

        collidableObjects.push(item);
        scene.add(item);
    }, undefined, (error) => {
        console.error(`Erreur lors du chargement du modèle pour ${itemType} :`, error);
    });
}

export function placeItems(scene, collidableObjects, playerInstance, config, getRandomPosition) {
    Object.entries(ITEM_TYPES).forEach(([itemType, itemData]) => {
        const count = itemType === 'FIREFLY' ? config.numFireflies : (config.potions[itemType] || 0);

        for (let i = 0; i < count; i++) {
            const { x, z } = getRandomPosition();
            if (x === null || z === null) {
                console.warn(`Impossible de placer ${itemType} par manque d'espace libre`);
                continue;
            }
            loadItemModel(itemType, scene, collidableObjects, x, z, playerInstance);
        }
    });
}
