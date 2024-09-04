// level.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { fadeToBlack, createRNG } from './utils.js';

import { loadNextLevel } from './game.js'; // Add this import

// Configuration parameters
const config = {
    gridRows: 4,
    gridCols: 4,
    cellSize: 10,
    wallHeight: 5,
    wallThickness: 0.5,
    numPotions: 5,
    numFireflies: 10,

    floorTexturePath: '/textures/planks-2.png',
    floorNormalMapPath: '/textures/planks-2-normal.png',

    ceilingTexturePath: '/textures/planks-2.png',
    ceilingNormalMapPath: '/textures/planks-2-normal.png',

    wallTexturePath: '/textures/planks-1.png',
    wallNormalMapPath: '/textures/planks-1-normal.png',

    verticalBeamTexturePath: '/textures/wall-1.png',
    verticalBeamNormalMapPath: '/textures/wall-1-normal.png',

    ceilingBeamTexturePath: '/textures/beam.png',
    ceilingBeamNormalMapPath: '/textures/beam-normal.png',

    columnTexturePath: '/textures/wood-1.png',
    columnNormalMapPath: '/textures/wood-1-normal.png',

    potionModelPath: '/glb/Mana_small_Potion.glb',

    lightIntensity: 2,
    lightColor: 0xFFAA00,
    ambientLightIntensity: 0.35,
    shadowMapSize: 1024,
    floatingObjectSpeedRange: [0.3, 0.9],
    floatingObjectHeight: 0.5,
};

let gridRows = config.gridRows;
let gridCols = config.gridCols;
const cellSize = config.cellSize;

let maze = [];
let stairsPosition = { x: 0, z: 0 };

export function createLevel(scene, collidableObjects, collisionHelpers, wizardCollisionBoxSize, wizardCollisionBoxOffset, clock, seed, character, characterBoundingBox, debugHelpers, increaseMana, addFirefly) {
    collidableObjects.forEach(obj => disposeObject(obj, scene));
    collidableObjects.length = 0;
    collisionHelpers.forEach(helper => disposeObject(helper, scene));
    collisionHelpers.length = 0;
    debugHelpers.length = 0;

    generateMaze(gridRows, gridCols, seed);
    createMazeGeometry(scene, collidableObjects);
    stairsPosition = placeStairway(scene, collidableObjects, character);
    createRoof(scene, collidableObjects);
    createCircularPlatform(scene, collidableObjects);
    placeManaPotions(scene, collidableObjects, increaseMana);
    addCastleLights(scene);
    placeFireflies(scene, collidableObjects, addFirefly);

    fadeToBlack(scene, clock, () => {
        placePlayer(scene, character, characterBoundingBox);
    });

    return stairsPosition;
}

export function placePlayer(scene, character, characterBoundingBox) {
    if (character && characterBoundingBox) {
        let spawnPosition = getRandomFreePosition();
        character.position.set(spawnPosition.x, 1, spawnPosition.z);
        characterBoundingBox.updateMatrixWorld();
    } else {
        console.error("Character or Character BoundingBox is not defined.");
    }
}

function getRandomFreePosition() {
    let freePositions = [];

    // Iterate through the maze grid to collect all possible free positions
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const position = { x: col * cellSize + cellSize / 2, z: row * cellSize + cellSize / 2 };
            if (!isPositionInWall(position)) {
                freePositions.push(position);
            }
        }
    }

    if (freePositions.length === 0) {
        console.error("No free positions available!");
        return { x: cellSize / 2, z: cellSize / 2 }; // Fallback to the center of the first cell
    }

    // Randomly select a free position
    const rng = Math.floor(Math.random() * freePositions.length);
    return freePositions[rng];
}

function isPositionInWall(position) {
    const row = Math.floor(position.z / cellSize);
    const col = Math.floor(position.x / cellSize);
    const cell = maze[row] && maze[row][col];
    return !cell || (cell.north && cell.south && cell.east && cell.west);
}

function createCeiling(scene, collidableObjects, gridCols, gridRows) {
    const textureLoader = new THREE.TextureLoader();
    const ceilingTexture = textureLoader.load(config.ceilingTexturePath);
    const ceilingNormalMap = textureLoader.load(config.ceilingNormalMapPath);

    ceilingTexture.wrapS = THREE.RepeatWrapping;
    ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(config.gridCols, config.gridRows);

    const ceilingMaterial = new THREE.MeshPhongMaterial({
        map: ceilingTexture,
        normalMap: ceilingNormalMap,
    });

    const ceilingGeometry = new THREE.PlaneGeometry(gridCols * cellSize, gridRows * cellSize);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.set((gridCols * cellSize) / 2, 6, (gridRows * cellSize) / 2);
    ceiling.rotation.x = -Math.PI / 2; // Inverse of the roof
    scene.add(ceiling);
    collidableObjects.push(ceiling);
}

function generateMaze(rows, cols, seed) {
    const rng = createRNG(seed);

    maze = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
            north: true,
            south: true,
            east: true,
            west: true,
            visited: false,
        }))
    );

    const stack = [];
    let currentCell = { row: 0, col: 0 };
    maze[currentCell.row][currentCell.col].visited = true;
    stack.push(currentCell);

    while (stack.length > 0) {
        const directions = [];
        if (currentCell.row > 0 && !maze[currentCell.row - 1][currentCell.col].visited) {
            directions.push("north");
        }
        if (currentCell.row < rows - 1 && !maze[currentCell.row + 1][currentCell.col].visited) {
            directions.push("south");
        }
        if (currentCell.col > 0 && !maze[currentCell.row][currentCell.col - 1].visited) {
            directions.push("west");
        }
        if (currentCell.col < cols - 1 && !maze[currentCell.row][currentCell.col + 1].visited) {
            directions.push("east");
        }

        if (directions.length > 0) {
            const direction = directions[Math.floor(rng() * directions.length)];

            if (direction === "north") {
                maze[currentCell.row][currentCell.col].north = false;
                maze[currentCell.row - 1][currentCell.col].south = false;
                currentCell = { row: currentCell.row - 1, col: currentCell.col };
            } else if (direction === "south") {
                maze[currentCell.row][currentCell.col].south = false;
                maze[currentCell.row + 1][currentCell.col].north = false;
                currentCell = { row: currentCell.row + 1, col: currentCell.col };
            } else if (direction === "west") {
                maze[currentCell.row][currentCell.col].west = false;
                maze[currentCell.row][currentCell.col - 1].east = false;
                currentCell = { row: currentCell.row, col: currentCell.col - 1 };
            } else if (direction === "east") {
                maze[currentCell.row][currentCell.col].east = false;
                maze[currentCell.row][currentCell.col + 1].west = false;
                currentCell = { row: currentCell.row, col: currentCell.col + 1 };
            }

            maze[currentCell.row][currentCell.col].visited = true;
            stack.push(currentCell);
        } else {
            currentCell = stack.pop();
        }
    }
}

function createMazeGeometry(scene, collidableObjects) {
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load(config.wallTexturePath);
    const wallNormalMap = textureLoader.load(config.wallNormalMapPath);

    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(1, config.wallHeight / config.cellSize);

    wallNormalMap.wrapS = THREE.RepeatWrapping;
    wallNormalMap.wrapT = THREE.RepeatWrapping;
    wallNormalMap.repeat.set(1, config.wallHeight / config.cellSize);

    const wallMaterial = new THREE.MeshPhongMaterial({
        map: wallTexture,
        normalMap: wallNormalMap,
        normalScale: new THREE.Vector2(0.5, 0.5), // Softer shadows
    });

    const floorTexture = textureLoader.load(config.floorTexturePath);
    const floorNormalMap = textureLoader.load(config.floorNormalMapPath);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(config.gridCols, config.gridRows);

    const floorMaterial = new THREE.MeshPhongMaterial({
        map: floorTexture,
        normalMap: floorNormalMap,
    });

    const ceilingTexture = textureLoader.load(config.ceilingTexturePath);
    const ceilingNormalMap = textureLoader.load(config.ceilingNormalMapPath);
    ceilingTexture.wrapS = THREE.RepeatWrapping;
    ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(config.gridCols, config.gridRows);

    const ceilingMaterial = new THREE.MeshPhongMaterial({
        map: ceilingTexture,
        normalMap: ceilingNormalMap,
    });

    for (let row = 0; row < config.gridRows; row++) {
        for (let col = 0; col < config.gridCols; col++) {
            const x = col * config.cellSize;
            const z = row * config.cellSize;

            createFloorSegment(scene, x, z, collidableObjects, floorMaterial);

            const wallNorth = maze[row][col].north;
            const wallSouth = maze[row][col].south;
            const wallWest = maze[row][col].west;
            const wallEast = maze[row][col].east;

            // Vertical beams at corners
            if (wallNorth || wallWest) {
                createVerticalBeam(scene, x, z, collidableObjects);
            }
            if (wallNorth || wallEast) {
                createVerticalBeam(scene, x + config.cellSize, z, collidableObjects);
            }
            if (wallSouth || wallWest) {
                createVerticalBeam(scene, x, z + config.cellSize, collidableObjects);
            }
            if (wallSouth || wallEast) {
                createVerticalBeam(scene, x + config.cellSize, z + config.cellSize, collidableObjects);
            }

            if (wallNorth) {
                createWall(scene, x + config.cellSize / 2, config.wallHeight / 2 + 1, z, config.cellSize, config.wallHeight, config.wallThickness, wallMaterial, collidableObjects);
                createCeilingBeam(scene, x + config.cellSize / 2, config.wallHeight + 1, z, config.cellSize, config.wallThickness, collidableObjects);
            }
            if (wallSouth) {
                createWall(scene, x + config.cellSize / 2, config.wallHeight / 2 + 1, z + config.cellSize, config.cellSize, config.wallHeight, config.wallThickness, wallMaterial, collidableObjects);
                createCeilingBeam(scene, x + config.cellSize / 2, config.wallHeight + 1, z + config.cellSize, config.cellSize, config.wallThickness, collidableObjects);
            }
            if (wallWest) {
                createWall(scene, x, config.wallHeight / 2 + 1, z + config.cellSize / 2, config.wallThickness, config.wallHeight, config.cellSize, wallMaterial, collidableObjects);
                createCeilingBeam(scene, x, config.wallHeight + 1, z + config.cellSize / 2, config.wallThickness, config.cellSize, collidableObjects);
            }
            if (wallEast) {
                createWall(scene, x + config.cellSize, config.wallHeight / 2 + 1, z + config.cellSize / 2, config.wallThickness, config.wallHeight, config.cellSize, wallMaterial, collidableObjects);
                createCeilingBeam(scene, x + config.cellSize, config.wallHeight + 1, z + config.cellSize / 2, config.wallThickness, config.cellSize, collidableObjects);
            }
        }
    }
    createRoof(scene, collidableObjects);
    createCeiling(scene, collidableObjects, gridCols, gridRows);
}

function createVerticalBeam(scene, x, z, collidableObjects) {
    const textureLoader = new THREE.TextureLoader();
    const beamTexture = textureLoader.load(config.verticalBeamTexturePath);
    const beamNormalMap = textureLoader.load(config.verticalBeamNormalMapPath);

    const beamHeight = config.wallHeight + 1;

    // Increase the width and depth to make the beam wider than the wall thickness
    const beamWidth = config.wallThickness + 0.3;
    const beamDepth = config.wallThickness + 0.3;

    const beamGeometry = new THREE.BoxGeometry(beamWidth, beamHeight, beamDepth);
    const beamMaterial = new THREE.MeshPhongMaterial({
        map: beamTexture,
        normalMap: beamNormalMap,
    });

    // Offset to properly cover the corner by centering the beam on both axes
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(x, beamHeight / 2 + 1, z);

    scene.add(beam);
    collidableObjects.push(beam);
}

function createCeilingBeam(scene, x, y, z, width, depth, collidableObjects) {
    const textureLoader = new THREE.TextureLoader();
    const beamTexture = textureLoader.load(config.ceilingBeamTexturePath);
    const beamNormalMap = textureLoader.load(config.ceilingBeamNormalMapPath);

    const beamGeometry = new THREE.BoxGeometry(width, config.wallThickness, depth);
    const beamMaterial = new THREE.MeshPhongMaterial({
        map: beamTexture,
        normalMap: beamNormalMap,
    });

    // Slightly offset the beam's position to avoid Z-fighting
    const offset = config.wallThickness / 2 + 0.01;
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(x, y + offset, z);

    scene.add(beam);
    collidableObjects.push(beam);
}

function createFloorSegment(scene, x, z, collidableObjects, material) {
    const floorThickness = 1;
    const floorGeometry = new THREE.BoxGeometry(config.cellSize, floorThickness, config.cellSize);
    const floor = new THREE.Mesh(floorGeometry, material);
    floor.position.set(x + config.cellSize / 2, 1 - floorThickness / 2, z + config.cellSize / 2);
    scene.add(floor);
    collidableObjects.push(floor);
}

function createWall(scene, x, y, z, width, height, depth, material, collidableObjects) {
    const wallGeometry = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(wallGeometry, material);
    wall.position.set(x, y, z);
    scene.add(wall);
    collidableObjects.push(wall);
}

function placeStairway(scene, collidableObjects, character) {
    let randomRow, randomCol, x, z;
    do {
        randomRow = THREE.MathUtils.randInt(0, config.gridRows - 1);
        randomCol = THREE.MathUtils.randInt(0, config.gridCols - 1);
        x = randomCol * config.cellSize + config.cellSize / 2;
        z = randomRow * config.cellSize + config.cellSize / 2;
    } while (Math.abs(character.position.x - x) < config.gridCols * config.cellSize / 2 && Math.abs(character.position.z - z) < config.gridRows * config.cellSize / 2);

    stairsPosition.x = x;
    stairsPosition.z = z;

    const columnGeometry = new THREE.CylinderGeometry(1.5, 1.5, 5, 32);
    const textureLoader = new THREE.TextureLoader();
    const columnTexture = textureLoader.load(config.columnTexturePath);
    const columnNormalMap = textureLoader.load(config.columnNormalMapPath);
    const columnMaterial = new THREE.MeshPhongMaterial({ map: columnTexture, normalMap: columnNormalMap });
    const column = new THREE.Mesh(columnGeometry, columnMaterial);
    column.position.set(x, 3, z);
    scene.add(column);
    collidableObjects.push(column);

    const steps = Math.ceil(5 / 0.2);
    for (let i = 0; i < steps; i++) {
        const stepGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.5);
        const step = new THREE.Mesh(stepGeometry, columnMaterial);
        const angle = (i * 2 * Math.PI) / steps;
        step.position.set(
            x + Math.cos(angle) * 1.5,
            i * 0.2 + 1,
            z + Math.sin(angle) * 1.5
        );
        step.rotation.y = -angle + Math.PI / 2;
        scene.add(step);
        collidableObjects.push(step);

        if (i === 0) {
            step.userData.isFirstStep = true;
        }
    }

    const stairwayBoxGeometry = new THREE.BoxGeometry(config.cellSize, 5, config.cellSize);
    const stairwayBoxMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, visible: false });
    const stairwayCollisionBox = new THREE.Mesh(stairwayBoxGeometry, stairwayBoxMaterial);
    stairwayCollisionBox.position.set(x, 2.5, z);
    scene.add(stairwayCollisionBox);
    collidableObjects.push(stairwayCollisionBox);

    stairwayCollisionBox.userData = {
        isCollectible: true,
        collect: function () {
            displayStairwayPrompt();
            document.addEventListener('keydown', onLevelUpKeyPress, { once: true });
        }
    };

    return stairsPosition;
}

function displayStairwayPrompt() {
    const prompt = document.createElement('div');
    prompt.innerText = 'Press Enter to go upstairs';
    prompt.style.position = 'absolute';
    prompt.style.top = '50%';
    prompt.style.left = '50%';
    prompt.style.transform = 'translate(-50%, -50%)';
    prompt.style.color = '#ffffff';
    prompt.style.fontFamily = 'Pixelated';
    prompt.style.fontSize = '24px';
    document.body.appendChild(prompt);

    setTimeout(() => {
        document.body.removeChild(prompt);
    }, 3000);
}

function onLevelUpKeyPress(event) {
    if (event.key === 'Enter') {
        loadNextLevel(); // Ensure this function is defined
    }
}


function createRoof(scene, collidableObjects) {
    const roofGeometry = new THREE.PlaneGeometry(config.gridCols * config.cellSize, config.gridRows * config.cellSize);
    const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set((config.gridCols * cellSize) / 2, 6, (config.gridRows * cellSize) / 2);
    roof.rotation.x = Math.PI / 2;
    scene.add(roof);
    collidableObjects.push(roof);
}

function createCircularPlatform(scene, collidableObjects) {
    const platformGeometry = new THREE.CylinderGeometry(2, 2, 1, 32);
    const platformMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, 0.4, 0);
    scene.add(platform);

    collidableObjects.push(platform);
}

function disposeObject(obj, scene) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
    scene.remove(obj);
}

function placeManaPotions(scene, collidableObjects, increaseMana) {
    const loader = new GLTFLoader();
    const rng = createRNG(Date.now().toString());

    for (let i = 0; i < config.numPotions; i++) {
        const randomRow = Math.floor(rng() * config.gridRows);
        const randomCol = Math.floor(rng() * config.gridCols);

        let x = randomCol * config.cellSize + rng() * config.cellSize * 0.5;
        let z = randomRow * config.cellSize + rng() * config.cellSize * 0.5;

        while (isPositionInWall({ x, z })) {
            x = randomCol * config.cellSize + rng() * config.cellSize * 0.5;
            z = randomRow * config.cellSize + rng() * config.cellSize * 0.5;
        }

        loader.load(config.potionModelPath, (gltf) => {
            const potion = gltf.scene;
            potion.name = `Potion_${i}`;
            potion.scale.set(0.25, 0.25, 0.25);
            potion.position.set(x, 1.5, z);

            const light = new THREE.PointLight(0x00ffff, 1, 5);
            light.position.set(0, 1.5, 0);
            potion.add(light);

            const floatSpeed = config.floatingObjectSpeedRange[0] + rng() * (config.floatingObjectSpeedRange[1] - config.floatingObjectSpeedRange[0]);
            const floatHeight = config.floatingObjectHeight;

            potion.userData = {
                isCollectible: true,
                collect: function () {
                    increaseMana(35);
                    setTimeout(() => {
                        scene.remove(potion);
                        collidableObjects.splice(collidableObjects.indexOf(potion), 1);
                    }, 50);
                },
                update: function (delta) {
                    const time = Date.now() * 0.001 * floatSpeed;
                    potion.position.y = 1.5 + Math.sin(time) * floatHeight;
                },
            };

            scene.add(potion);
            collidableObjects.push(potion);
        });
    }
}

function addCastleLights(scene) {
    const lightPositions = [
        new THREE.Vector3(config.gridCols * config.cellSize / 2, 5, config.gridRows * config.cellSize / 2),
        new THREE.Vector3(config.gridCols * config.cellSize / 4, 6, config.gridRows * config.cellSize / 4),
        new THREE.Vector3((config.gridCols * 3) / 4 * config.cellSize, 5, config.gridRows * config.cellSize / 4),
        new THREE.Vector3(config.gridCols * config.cellSize / 4, 5, (config.gridRows * 3) / 4 * config.cellSize),
        new THREE.Vector3((config.gridCols * 3) / 4 * config.cellSize, 5, (config.gridRows * 3) / 4 * config.cellSize)
    ];

    lightPositions.forEach(pos => {
        const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 20);
        light.position.copy(pos);
        scene.add(light);

        const flickerIntensity = () => {
            const intensity = config.lightIntensity + Math.random() * 0.5;
            light.intensity = intensity;
        };
        setInterval(flickerIntensity, 500 );
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, config.ambientLightIntensity);
    scene.add(ambientLight);
}

function placeFireflies(scene, collidableObjects, addFirefly) {
    const rng = createRNG(Date.now().toString());

    for (let i = 0; i < config.numFireflies; i++) {
        const randomRow = Math.floor(rng() * config.gridRows);
        const randomCol = Math.floor(rng() * config.gridCols);

        let x = randomCol * config.cellSize + rng() * config.cellSize * 0.5;
        let z = randomRow * config.cellSize + rng() * config.cellSize * 0.5;

        while (isPositionInWall({ x, z })) {
            x = randomCol * config.cellSize + rng() * config.cellSize * 0.5;
            z = randomRow * config.cellSize + rng() * config.cellSize * 0.5;
        }

        const fireflyGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const fireflyMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const firefly = new THREE.Mesh(fireflyGeometry, fireflyMaterial);
        firefly.position.set(x, 1.5, z);
        firefly.name = `Firefly_${i}`;

        const light = new THREE.PointLight(0xEEA354, 5, 5);
        light.position.set(0, 1.5, 0);
        firefly.add(light);

        const floatSpeed = config.floatingObjectSpeedRange[0] + rng() * (config.floatingObjectSpeedRange[1] - config.floatingObjectSpeedRange[0]);
        const floatHeight = config.floatingObjectHeight;

        firefly.userData = {
            isCollectible: true,

            collect: function () {
                addFirefly();
                scene.remove(firefly);
                collidableObjects.splice(collidableObjects.indexOf(firefly), 1);
            },
            update: function (delta) {
                const time = Date.now() * 0.001 * floatSpeed;
                firefly.position.y = 1.5 + Math.sin(time) * floatHeight;
            },
        };

        scene.add(firefly);
        collidableObjects.push(firefly);
    }
}
