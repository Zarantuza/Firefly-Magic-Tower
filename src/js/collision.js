import * as THREE from 'three';

export function checkCollisions(direction, collidableObjects, characterBoundingBox) {
    if (!characterBoundingBox) return null;

    const characterBox = new THREE.Box3().setFromObject(characterBoundingBox);
    const predictedBox = characterBox.clone().translate(direction);

    for (let i = 0; i < collidableObjects.length; i++) {
        const obj = collidableObjects[i];

        if (!obj || !obj.geometry || !obj.material) continue;

        const objectBox = new THREE.Box3().setFromObject(obj);

        if (predictedBox.intersectsBox(objectBox)) {
            if (obj.userData.isCollectible) {
                obj.userData.collect(); // Trigger the collection
                return null; // Do not trigger physical reaction to collectible items
            }
            return obj; // Return the object involved in the collision
        } else {
            if (obj.userData.isIn) {
                obj.userData.isIn = false;
            }
        }
    }

    return null; // Return null if no collision occurred
}
