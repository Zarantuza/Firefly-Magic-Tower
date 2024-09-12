// level.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { fadeToBlack, createRNG } from './utils.js';
import { loadNextLevel } from './game.js';
import { NavMesh } from './enemyNavigation.js';
import { spawnEnemy } from './enemy.js';
import { player } from './player.js';
import { placeItems } from './items.js';  // Import the new placeItems function

// Configuration parameters
const config = {
    gridRows: 4,
    gridCols: 4,
    cellSize: 10,
    wallHeight: 5,
    wallThickness: 0.5,
    numFireflies: 10,

    potions: {
        SMALL_LIFE_POTION: 2,
        BIG_LIFE_POTION: 1,
        SMALL_MANA_POTION: 2,
        BIG_MANA_POTION: 1,
        SMALL_SPEED_POTION: 2,
        BIG_SPEED_POTION: 1
    },

    floorTexturePath: '/textures/stones-3.png',
    floorNormalMapPath: '/textures/stones-3-normal.png',
    floorDisplacementMapPath: '/textures/stones-3-disp.png',
    floorTextureRepeat: { x: 4, y: 4 },
    floorNormalStrength: 5,
    floorDisplacementScale: 0,

    stairsTexturePath: '/textures/stones-3.png',
    stairsNormalMapPath: '/textures/stones-3-normal.png',
    stairsDisplacementMapPath: '/textures/stones-3-disp.png',
    stairsTextureRepeat: { x: 5, y: 5 },
    stairsNormalStrength: 0,
    stairsDisplacementScale: 0,

    ceilingTexturePath: '/textures/planks-2.png',
    ceilingNormalMapPath: '/textures/planks-2-normal.png',
    ceilingDisplacementMapPath: '/textures/wall-1-disp.png',
    ceilingTextureRepeat: { x: 8, y: 8 },
    ceilingNormalStrength: 0.5,
    ceilingDisplacementScale: 0.01,

    wallTexturePath: '/textures/planks-1.png',
    wallNormalMapPath: '/textures/planks-1-normal.png',
    wallDisplacementMapPath: '/textures/planks-2-disp.png',
    wallTextureRepeat: { x: 1, y: 1 },
    wallNormalStrength: 0.1,
    wallDisplacementScale: 0.5,

    verticalBeamTexturePath: '/textures/wall-3.png',
    verticalBeamNormalMapPath: '/textures/wall-3-normal.png',
    verticalBeamDisplacementMapPath: '/textures/wall-3-disp.png',
    verticalBeamTextureRepeat: { x: 0.1, y: 1 },
    verticalBeamNormalStrength: 0,
    verticalBeamDisplacementScale: 0.5,

    ceilingBeamTexturePath: '/textures/wall-1.png',
    ceilingBeamNormalMapPath: '/textures/wall-1-normal.png',
    ceilingBeamDisplacementMapPath: '/textures/wall-1-disp.png',
    ceilingBeamTextureRepeat: { x: 2, y: 2 },
    ceilingBeamNormalStrength: 0.6,
    ceilingBeamDisplacementScale: 0.05,

    columnTexturePath: '/textures/stones-3.png',
    columnNormalMapPath: '/textures/stones-3-normal.png',
    columnDisplacementMapPath: '/textures/stones-3.png',
    columnTextureRepeat: { x: 3, y: 3 },
    columnNormalStrength: 0.9,
    columnDisplacementScale: 0.2,

    stairsTexturePath: '/textures/wood-1.png',
    stairsNormalMapPath: '/textures/wood-1-normal.png',
    stairsDisplacementMapPath: '/textures/wood-1-disp.png',
    stairsTextureRepeat: { x: 0.2, y: 0.2 },
    stairsNormalStrength: 0,
    stairsDisplacementScale: 0,

    lightIntensity: 8,
    lightColor: 0xFFAA00,
    ambientLightIntensity: 0.2,
    shadowMapSize: 1024,
    floatingObjectSpeedRange: [0.3, 5],
    floatingObjectHeight: 0.5,
};


let gridRows = config.gridRows;
let gridCols = config.gridCols;
const cellSize = config.cellSize;
let navMesh;
let occupiedPositions = new Set();

let maze = [];
let stairsPosition = { x: 0, z: 0 };

export async function createLevel(scene, collidableObjects, collisionHelpers, wizardCollisionBoxSize, wizardCollisionBoxOffset, clock, seed, character, characterBoundingBox, debugHelpers, increaseMana, addFirefly, enemies) {
    //console.log("Starting to create new level");

    // Clear existing objects and enemies
    collidableObjects.forEach(obj => disposeObject(obj, scene));
    collidableObjects.length = 0;
    collisionHelpers.forEach(helper => disposeObject(helper, scene));
    collisionHelpers.length = 0;
    debugHelpers.length = 0;

    enemies.forEach(enemy => {
        if (enemy.mesh) {
            scene.remove(enemy.mesh);
        }
    });
    enemies.length = 0;

    generateMaze(gridRows, gridCols, seed);
    createMazeGeometry(scene, collidableObjects);
    stairsPosition = placeStairway(scene, collidableObjects, character);
    createRoof(scene, collidableObjects);
    
    //console.log("About to place items...");
    await placeItems(scene, collidableObjects, { addFirefly, collectFirefly: player.collectFirefly }, config, getRandomPosition);

    addCastleLights(scene);
    //console.log("Items placed.");

    

    try {
        
        // Create NavMesh
        navMesh = new NavMesh(maze);
        //console.log("NavMesh created:", navMesh);
        visualizeNavMesh(scene, navMesh);
        //console.log("NavMesh created:", navMesh);
        
        

        // Spawn new enemies
        const MAX_ENEMIES = 5;
        const enemyPromises = [];
        for (let i = 0; i < MAX_ENEMIES; i++) {
            enemyPromises.push(spawnEnemy(scene, collidableObjects, navMesh));
            //console.log (`Spawning enemy ${i+1} of ${MAX_ENEMIES}`);
        }

        const newEnemies = await Promise.all(enemyPromises);
        newEnemies.forEach(enemy => {
            if (enemy) {
                enemies.push(enemy);
                //console.log("Enemy added to scene:", enemy);
            }
        });

        //console.log(`Number of enemies created: ${enemies.length}`);
    } catch (error) {
        console.error('Error creating NavMesh or spawning enemies:', error);
    }
    placePlayer(character, characterBoundingBox);

    fadeToBlack(scene, clock, () => {
    });

    //console.log("Level creation completed");
    return { stairsPosition, navMesh };
}

export function placePlayer(character, characterBoundingBox) {
    if (!character || !characterBoundingBox) {
        console.error("Character or Character BoundingBox is not defined.");
        return;
    }

    // Place the player at the center of the first cell
    const spawnPosition = {
        x: config.cellSize/2 ,
        y: 1.05,  // Slightly above the floor
        z: config.cellSize/2 
    };
    
    character.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
    
    // Determine the initial orientation based on the open paths
    const firstCell = maze[0][0];
    let rotation = 0;
    
    if (!firstCell.east) {
        rotation = 0; // Face east
    } else if (!firstCell.south) {
        rotation = Math.PI / 2; // Face south
    } else if (!firstCell.west) {
        rotation = Math.PI; // Face west
    } else if (!firstCell.north) {
        rotation = -Math.PI / 2; // Face north
    }
    
    character.rotation.y = rotation;
    
    characterBoundingBox.updateMatrixWorld();
    
    //console.log(`Player spawned at: (${spawnPosition.x}, ${spawnPosition.y}, ${spawnPosition.z}) with rotation: ${rotation}`);
}

function getRandomFreePosition() {
    const freePositions = [];

    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const position = { 
                x: col * cellSize + cellSize / 2, 
                z: row * cellSize + cellSize / 2 
            };
            if (!isPositionInWall(position) && !isPositionOccupied(position.x, position.z)) {
                freePositions.push(position);
            }
        }
    }

    if (freePositions.length === 0) {
        console.error("No free positions available!");
        return { x: cellSize / 2, z: cellSize / 2 }; // Fallback to the center of the first cell
    }

    const randomIndex = Math.floor(Math.random() * freePositions.length);
    return freePositions[randomIndex];
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
    const ceilingDisplacementMap = textureLoader.load(config.ceilingDisplacementMapPath);

    ceilingTexture.wrapS = THREE.RepeatWrapping;
    ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(config.ceilingTextureRepeat.x, config.ceilingTextureRepeat.y);

    ceilingNormalMap.wrapS = THREE.RepeatWrapping;
    ceilingNormalMap.wrapT = THREE.RepeatWrapping;
    ceilingNormalMap.repeat.set(config.ceilingTextureRepeat.x, config.ceilingTextureRepeat.y);

    ceilingDisplacementMap.wrapS = THREE.RepeatWrapping;
    ceilingDisplacementMap.wrapT = THREE.RepeatWrapping;
    ceilingDisplacementMap.repeat.set(config.ceilingTextureRepeat.x, config.ceilingTextureRepeat.y);

    const ceilingMaterial = new THREE.MeshPhongMaterial({
        map: ceilingTexture,
        normalMap: ceilingNormalMap,
        normalScale: new THREE.Vector2(config.ceilingNormalStrength, config.ceilingNormalStrength),
        displacementMap: ceilingDisplacementMap,
        displacementScale: config.ceilingDisplacementScale,
    });

    const ceilingGeometry = new THREE.PlaneGeometry(gridCols * cellSize, gridRows * cellSize);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.set((gridCols * cellSize) / 2, 6, (gridRows * cellSize) / 2);
    ceiling.rotation.x = -Math.PI / 2;
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

function visualizeNavMesh(scene, navMesh) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    navMesh.nodes.forEach(node => {
        positions.push(node.position.x, node.position.y, node.position.z);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xff0000, size: 0.5 });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
}

function createMazeGeometry(scene, collidableObjects) {
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load(config.wallTexturePath);
    const wallNormalMap = textureLoader.load(config.wallNormalMapPath);
    const wallDisplacementMap = textureLoader.load(config.wallDisplacementMapPath);

    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(config.wallTextureRepeat.x, config.wallTextureRepeat.y);

    wallNormalMap.wrapS = THREE.RepeatWrapping;
    wallNormalMap.wrapT = THREE.RepeatWrapping;
    wallNormalMap.repeat.set(config.wallTextureRepeat.x, config.wallTextureRepeat.y);

    wallDisplacementMap.wrapS = THREE.RepeatWrapping;
    wallDisplacementMap.wrapT = THREE.RepeatWrapping;
    wallDisplacementMap.repeat.set(config.wallTextureRepeat.x, config.wallTextureRepeat.y);

    const wallMaterial = new THREE.MeshPhongMaterial({
        map: wallTexture,
        normalMap: wallNormalMap,
        normalScale: new THREE.Vector2(config.wallNormalStrength, config.wallNormalStrength),
        displacementMap: wallDisplacementMap,
        displacementScale: config.wallDisplacementScale,
    });

    const floorTexture = textureLoader.load(config.floorTexturePath);
    const floorNormalMap = textureLoader.load(config.floorNormalMapPath);
    const floorDisplacementMap = textureLoader.load(config.floorDisplacementMapPath);
    
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(config.floorTextureRepeat.x, config.floorTextureRepeat.y);

    floorNormalMap.wrapS = THREE.RepeatWrapping;
    floorNormalMap.wrapT = THREE.RepeatWrapping;
    floorNormalMap.repeat.set(config.floorTextureRepeat.x, config.floorTextureRepeat.y);

    floorDisplacementMap.wrapS = THREE.RepeatWrapping;
    floorDisplacementMap.wrapT = THREE.RepeatWrapping;
    floorDisplacementMap.repeat.set(config.floorTextureRepeat.x, config.floorTextureRepeat.y);

    const floorMaterial = new THREE.MeshPhongMaterial({
        map: floorTexture,
        normalMap: floorNormalMap,
        normalScale: new THREE.Vector2(config.floorNormalStrength, config.floorNormalStrength),
        displacementMap: floorDisplacementMap,
        displacementScale: config.floorDisplacementScale,
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
    const beamDisplacementMap = textureLoader.load(config.verticalBeamDisplacementMapPath);

    const beamHeight = config.wallHeight + 1;

    beamTexture.wrapS = THREE.RepeatWrapping;
    beamTexture.wrapT = THREE.RepeatWrapping;
    beamTexture.repeat.set(config.verticalBeamTextureRepeat.x, config.verticalBeamTextureRepeat.y);

    beamNormalMap.wrapS = THREE.RepeatWrapping;
    beamNormalMap.wrapT = THREE.RepeatWrapping;
    beamNormalMap.repeat.set(config.verticalBeamTextureRepeat.x, config.verticalBeamTextureRepeat.y);

    beamDisplacementMap.wrapS = THREE.RepeatWrapping;
    beamDisplacementMap.wrapT = THREE.RepeatWrapping;
    beamDisplacementMap.repeat.set(config.verticalBeamTextureRepeat.x, config.verticalBeamTextureRepeat.y);

    const beamWidth = config.wallThickness + 0.3;
    const beamDepth = config.wallThickness + 0.3;

    const beamGeometry = new THREE.BoxGeometry(beamWidth, beamHeight, beamDepth);
    const beamMaterial = new THREE.MeshPhongMaterial({
        map: beamTexture,
        normalMap: beamNormalMap,
        normalScale: new THREE.Vector2(config.verticalBeamNormalStrength, config.verticalBeamNormalStrength),
        displacementMap: beamDisplacementMap,
        displacementScale: config.verticalBeamDisplacementScale,
    });

    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(x, beamHeight / 2 + 1, z);

    scene.add(beam);
    collidableObjects.push(beam);
}

function createCeilingBeam(scene, x, y, z, width, depth, collidableObjects) {
    const textureLoader = new THREE.TextureLoader();
    const beamTexture = textureLoader.load(config.ceilingBeamTexturePath);
    const beamNormalMap = textureLoader.load(config.ceilingBeamNormalMapPath);
    const beamDisplacementMap = textureLoader.load(config.ceilingBeamDisplacementMapPath);

    beamTexture.wrapS = THREE.RepeatWrapping;
    beamTexture.wrapT = THREE.RepeatWrapping;
    beamTexture.repeat.set(config.ceilingBeamTextureRepeat.x, config.ceilingBeamTextureRepeat.y);

    beamNormalMap.wrapS = THREE.RepeatWrapping;
    beamNormalMap.wrapT = THREE.RepeatWrapping;
    beamNormalMap.repeat.set(config.ceilingBeamTextureRepeat.x, config.ceilingBeamTextureRepeat.y);

    beamDisplacementMap.wrapS = THREE.RepeatWrapping;
    beamDisplacementMap.wrapT = THREE.RepeatWrapping;
    beamDisplacementMap.repeat.set(config.ceilingBeamTextureRepeat.x, config.ceilingBeamTextureRepeat.y);

    const beamGeometry = new THREE.BoxGeometry(width, config.wallThickness, depth);
    const beamMaterial = new THREE.MeshPhongMaterial({
        map: beamTexture,
        normalMap: beamNormalMap,
        normalScale: new THREE.Vector2(config.ceilingBeamNormalStrength, config.ceilingBeamNormalStrength),
        displacementMap: beamDisplacementMap,
        displacementScale: config.ceilingBeamDisplacementScale,
    });

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

    const columnGeometry = new THREE.CylinderGeometry(1.5, 1.5, 10, 32);
    const textureLoader = new THREE.TextureLoader();
    
    // Column textures
    const columnTexture = textureLoader.load(config.columnTexturePath);
    const columnNormalMap = textureLoader.load(config.columnNormalMapPath);
    const columnDisplacementMap = textureLoader.load(config.columnDisplacementMapPath);

    columnTexture.wrapS = columnTexture.wrapT = THREE.RepeatWrapping;
    columnNormalMap.wrapS = columnNormalMap.wrapT = THREE.RepeatWrapping;
    columnDisplacementMap.wrapS = columnDisplacementMap.wrapT = THREE.RepeatWrapping;

    columnTexture.repeat.set(config.columnTextureRepeat.x, config.columnTextureRepeat.y);
    columnNormalMap.repeat.set(config.columnTextureRepeat.x, config.columnTextureRepeat.y);
    columnDisplacementMap.repeat.set(config.columnTextureRepeat.x, config.columnTextureRepeat.y);

    const columnMaterial = new THREE.MeshPhongMaterial({
        map: columnTexture,
        normalMap: columnNormalMap,
        normalScale: new THREE.Vector2(config.columnNormalStrength, config.columnNormalStrength),
        displacementMap: columnDisplacementMap,
        displacementScale: config.columnDisplacementScale,
    });

    const column = new THREE.Mesh(columnGeometry, columnMaterial);
    column.position.set(x, 3, z);
    scene.add(column);
    collidableObjects.push(column);

    // Stairs textures
    const stairsTexture = textureLoader.load(config.stairsTexturePath);
    const stairsNormalMap = textureLoader.load(config.stairsNormalMapPath);
    const stairsDisplacementMap = textureLoader.load(config.stairsDisplacementMapPath);

    stairsTexture.wrapS = stairsTexture.wrapT = THREE.RepeatWrapping;
    stairsNormalMap.wrapS = stairsNormalMap.wrapT = THREE.RepeatWrapping;
    stairsDisplacementMap.wrapS = stairsDisplacementMap.wrapT = THREE.RepeatWrapping;

    stairsTexture.repeat.set(config.stairsTextureRepeat.x, config.stairsTextureRepeat.y);
    stairsNormalMap.repeat.set(config.stairsTextureRepeat.x, config.stairsTextureRepeat.y);
    stairsDisplacementMap.repeat.set(config.stairsTextureRepeat.x, config.stairsTextureRepeat.y);

    const stairsMaterial = new THREE.MeshPhongMaterial({
        map: stairsTexture,
        normalMap: stairsNormalMap,
        normalScale: new THREE.Vector2(config.stairsNormalStrength, config.stairsNormalStrength),
        displacementMap: stairsDisplacementMap,
        displacementScale: config.stairsDisplacementScale,
    });

    const steps = Math.ceil(5 / 0.2);
    for (let i = 0; i < steps; i++) {
        const stepGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.5);
        const step = new THREE.Mesh(stepGeometry, stairsMaterial);
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
        isIn: false,
        collect: function () {
            if (!stairwayCollisionBox.userData.isIn) {
                stairwayCollisionBox.userData.isIn = true;
                displayStairwayPrompt();
            }
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
    prompt.style.fontFamily = 'Vinque';  // Use the 'Vinque' font
    prompt.style.fontSize = '30px';
    document.body.appendChild(prompt);

    setTimeout(() => {
        document.body.removeChild(prompt);
    }, 3000);
}


function onLevelUpKeyPress(event) {
    if (event.key === 'Enter') {
        loadNextLevel(); 
    }
}

function createRoof(scene, collidableObjects) {
    const textureLoader = new THREE.TextureLoader();

    const ceilingTexture = textureLoader.load(config.ceilingTexturePath);
    const ceilingNormalMap = textureLoader.load(config.ceilingNormalMapPath);
    const ceilingDisplacementMap = textureLoader.load(config.ceilingDisplacementMapPath);

    ceilingTexture.wrapS = THREE.RepeatWrapping;
    ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(config.ceilingTextureRepeat.x, config.ceilingTextureRepeat.y);

    ceilingNormalMap.wrapS = THREE.RepeatWrapping;
    ceilingNormalMap.wrapT = THREE.RepeatWrapping;
    ceilingNormalMap.repeat.set(config.ceilingTextureRepeat.x, config.ceilingTextureRepeat.y);

    ceilingDisplacementMap.wrapS = THREE.RepeatWrapping;
    ceilingDisplacementMap.wrapT = THREE.RepeatWrapping;
    ceilingDisplacementMap.repeat.set(config.ceilingTextureRepeat.x, config.ceilingTextureRepeat.y);

    const roofMaterial = new THREE.MeshPhongMaterial({
        map: ceilingTexture,
        normalMap: ceilingNormalMap,
        normalScale: new THREE.Vector2(config.ceilingNormalStrength, config.ceilingNormalStrength),
        displacementMap: ceilingDisplacementMap,
        displacementScale: config.ceilingDisplacementScale,
        side: THREE.DoubleSide
    });

    const roofGeometry = new THREE.PlaneGeometry(config.gridCols * config.cellSize, config.gridRows * config.cellSize);

    const roof = new THREE.Mesh(roofGeometry, roofMaterial);

    roof.position.set((config.gridCols * cellSize) / 2, config.wallHeight*1.3, (config.gridRows * cellSize) / 2);

    roof.rotation.x = -Math.PI / 2;

    scene.add(roof);
    collidableObjects.push(roof);
}

function disposeObject(obj, scene) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
    scene.remove(obj);
}

function getRandomPosition() {
    const rng = createRNG(Date.now().toString());
    let x, z;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        const randomRow = Math.floor(rng() * config.gridRows);
        const randomCol = Math.floor(rng() * config.gridCols);
        x = randomCol * config.cellSize + rng() * config.cellSize;
        z = randomRow * config.cellSize + rng() * config.cellSize;
        attempts++;

        if (attempts > maxAttempts) {
            //console.warn("Could not find a free position after max attempts");
            return null;
        }
    } while (isPositionOccupied(x, z) || isPositionInWall({ x, z }));

    occupiedPositions.add(`${Math.floor(x)},${Math.floor(z)}`);
    return { x, z };
}
function isPositionOccupied(x, z) {
    return occupiedPositions.has(`${Math.floor(x)},${Math.floor(z)}`);
}

export function checkCollisionsForCollectibles(character, collidableObjects) {
    collidableObjects.forEach((obj) => {
        if (obj.userData.isCollectible && !obj.userData.isCollected) {
            const distance = character.position.distanceTo(obj.position);
            if (distance < 1) {
                obj.userData.collect();
            }
        }
    });
}

function addCastleLights(scene) {
    const lightPositions = [
        new THREE.Vector3(config.gridCols * config.cellSize / 2, config.wallHeight, config.gridRows * config.cellSize / 2),
        new THREE.Vector3(config.gridCols * config.cellSize / 4, config.wallHeight, config.gridRows * config.cellSize / 4),
        new THREE.Vector3((config.gridCols * 3) / 4 * config.cellSize, config.wallHeight, config.gridRows * config.cellSize / 4),
        new THREE.Vector3(config.gridCols * config.cellSize / 4, config.wallHeight, (config.gridRows * 3) / 4 * config.cellSize),
        new THREE.Vector3((config.gridCols * 3) / 4 * config.cellSize, config.wallHeight, (config.gridRows * 3) / 4 * config.cellSize)
    ];

    lightPositions.forEach(pos => {
        const light = new THREE.PointLight(config.lightColor, config.lightIntensity, 20);
        light.position.copy(pos);
        scene.add(light);

        const flickerIntensity = () => {
            const intensity = config.lightIntensity + Math.random() * 1.5;
            light.intensity = intensity;
        };
        setInterval(flickerIntensity, 250);
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, config.ambientLightIntensity);
    scene.add(ambientLight);
}

export { config };