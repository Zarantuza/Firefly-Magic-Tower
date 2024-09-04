import * as THREE from 'three';
import seedrandom from 'seedrandom';

export function onWindowResize(camera, renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export function onMouseMove(character, cameraPitch, cameraDistance, updateCameraPosition) {
    return (event) => {
        if (character) {
            const rotationSpeed = 0.002;
            character.rotation.y -= event.movementX * rotationSpeed;

            const tiltSpeed = 0.001;
            cameraPitch += event.movementY * tiltSpeed;
            cameraPitch = THREE.MathUtils.clamp(cameraPitch, -Math.PI / 4, Math.PI / 4);

            updateCameraPosition(character, cameraPitch, cameraDistance);
        }
    };
}

export function onMouseWheel(cameraDistance, updateCameraPosition, character) {
    return (event) => {
        cameraDistance += event.deltaY * 0.01;
        cameraDistance = THREE.MathUtils.clamp(cameraDistance, 3, 10);

        updateCameraPosition(character, cameraDistance);
    };
}

export function adjustToGroundLevel(character, collidableObjects) {
    if (!character || !character.geometry || !character.geometry.boundingBox) {
        return; // Exit silently if character or bounding box is not properly initialized
    }

    const raycaster = new THREE.Raycaster(
        new THREE.Vector3(character.position.x, character.position.y + 1, character.position.z),
        new THREE.Vector3(0, -1, 0)
    );
    const intersects = raycaster.intersectObjects(collidableObjects);

    if (intersects.length > 0) {
        const groundY = intersects[0].point.y;
        character.position.y = groundY + character.geometry.boundingBox.min.y + 0.5;
    }
}

export function disposeObject(obj, scene) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
    scene.remove(obj);
}

export function fadeToBlack(scene, clock, callback) {
    const fadeDuration = 1000;
    const fadePlane = new THREE.PlaneGeometry(30, 30);
    const fadeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, transparent: true });
    const fadeMesh = new THREE.Mesh(fadePlane, fadeMaterial);

    fadeMesh.position.set(0, 5, -10);
    scene.add(fadeMesh);

    const startTime = clock.getElapsedTime();

    function fadeAnimation() {
        const elapsed = clock.getElapsedTime() - startTime;
        fadeMaterial.opacity = Math.min(1, elapsed / (fadeDuration / 1000));

        if (elapsed >= fadeDuration / 1000) {
            callback();
            fadeMaterial.opacity = 0;
            scene.remove(fadeMesh);
        } else {
            requestAnimationFrame(fadeAnimation);
        }
    }

    fadeAnimation();
}

export function createRNG(seed) {
    return seedrandom(seed); // Use seedrandom to create a seeded random number generator
}
