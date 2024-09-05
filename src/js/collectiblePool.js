import * as THREE from 'three';

class CollectiblePool {
    constructor(scene, poolSize) {
        this.scene = scene;
        this.pool = [];
        this.activeCollectibles = [];

        // Pre-create the pool of collectible objects
        for (let i = 0; i < poolSize; i++) {
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const collectible = new THREE.Mesh(geometry, material);
            collectible.visible = false;

            // Debugging: Add a bounding box helper for each collectible
            collectible.boundingBox = new THREE.BoxHelper(collectible, 0xff0000);
            collectible.boundingBox.visible = false; // Hide by default
            this.scene.add(collectible.boundingBox);

            this.pool.push(collectible);
            this.scene.add(collectible);
        }
    }

    getCollectible(position) {
        const collectible = this.pool.pop();
        if (collectible) {
            collectible.position.copy(position);
            collectible.visible = true;

            // Update and show the bounding box for debugging
            collectible.boundingBox.update();
            collectible.boundingBox.visible = true;

            this.activeCollectibles.push(collectible);
        }
        return collectible;
    }

    releaseCollectible(collectible) {
        collectible.visible = false;

        // Hide the bounding box when releasing the collectible
        collectible.boundingBox.visible = false;

        this.activeCollectibles = this.activeCollectibles.filter(c => c !== collectible);
        this.pool.push(collectible);
    }

    disposeCollectibles() {
        this.activeCollectibles.forEach(collectible => {
            this.disposeCollectible(collectible);
        });
        this.pool.forEach(collectible => {
            this.disposeCollectible(collectible);
        });
        this.activeCollectibles = [];
        this.pool = [];
    }

    disposeCollectible(collectible) {
        collectible.geometry.dispose();
        collectible.material.dispose();
        this.scene.remove(collectible);
    }
}

export { CollectiblePool };
