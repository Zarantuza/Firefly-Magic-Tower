//utils.js
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

            // Adjust pitch limits between -180 degrees (-Math.PI) and 180 degrees (Math.PI)
            const maxPitch = Math.PI/15; // 90 degrees in radians
            const minPitch = -Math.PI/2.1; // -180 degrees in radians

            cameraPitch += event.movementY * tiltSpeed;
            cameraPitch = THREE.MathUtils.clamp(cameraPitch, minPitch, maxPitch);

            updateCameraPosition(character, cameraPitch, cameraDistance);
        }
    };
}

export function updateCameraRotation(event) {
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Update camera yaw (left-right rotation)
    camera.rotation.y -= movementX * 0.002;

    // Update camera pitch (up-down rotation) and clamp to prevent over-rotation
    camera.rotation.x -= movementY * 0.002;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -Math.PI / 2, Math.PI / 2);
}




export function onMouseWheel(cameraDistance, cameraPitch, updateCameraPosition, character) {
    return (event) => {
        // Adjust cameraDistance based on the mouse wheel input (scrolling up/down)
        cameraDistance += event.deltaY * 0.01;

        // Clamp the cameraDistance between 1 and 5 (or whatever limits you prefer)
        cameraDistance = THREE.MathUtils.clamp(cameraDistance, 1, 5);

        // Update the camera position based on the updated cameraDistance and cameraPitch
        updateCameraPosition(character, cameraPitch, cameraDistance);
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
