// enemyNavigation.js

import * as THREE from 'three';
import { config } from './level.js';



export class NavMesh {
    constructor(maze) {
        this.maze = maze;
    this.grid = this.createNavigationGrid();
    this.nodes = this.createNodes();
    console.log(`NavMesh initialized with ${this.nodes.length} nodes`);
    }

    createNodes() {
        const nodes = [];
        for (let row = 0; row < this.maze.length; row++) {
            for (let col = 0; col < this.maze[row].length; col++) {
                // Consider a cell walkable if it has at least one open side
                if (!this.maze[row][col].north || !this.maze[row][col].south ||
                    !this.maze[row][col].east || !this.maze[row][col].west) {
                    nodes.push({
                        position: new THREE.Vector3(
                            col * config.cellSize + config.cellSize / 2,
                            1,  // Adjust height as needed
                            row * config.cellSize + config.cellSize / 2
                        ),
                        row: row,
                        col: col
                    });
                }
            }
        }
        console.log(`Created ${nodes.length} nodes`);
        return nodes;
    }

    getRandomNode() {
        if (!this.nodes || this.nodes.length === 0) {
            console.warn('No nodes available in NavMesh');
            return null;
        }
        return this.nodes[Math.floor(Math.random() * this.nodes.length)];
    }

    createNavigationGrid() {
        const grid = [];
        for (let row = 0; row < this.maze.length; row++) {
            grid[row] = [];
            for (let col = 0; col < this.maze[row].length; col++) {
                grid[row][col] = {
                    walkable: true,
                    x: col * config.cellSize + config.cellSize / 2,
                    z: row * config.cellSize + config.cellSize / 2
                };

                // Mark cells with walls as non-walkable
                if (this.maze[row][col].north) grid[row][col].walkable = false;
                if (this.maze[row][col].south) grid[row][col].walkable = false;
                if (this.maze[row][col].east) grid[row][col].walkable = false;
                if (this.maze[row][col].west) grid[row][col].walkable = false;
            }
        }
        return grid;
    }



    getRandomNode() {
        if (this.nodes.length === 0) {
            throw new Error("No walkable nodes in the NavMesh");
        }
        return this.nodes[Math.floor(Math.random() * this.nodes.length)];
    }

    getClosestNode(position) {
        let closestNode = null;
        let closestDistance = Infinity;
        for (const node of this.nodes) {
            const distance = position.distanceTo(node.position);
            if (distance < closestDistance) {
                closestNode = node;
                closestDistance = distance;
            }
        }
        return closestNode;
    }

    findPath(start, end) {
        const startCell = this.worldToGrid(start);
        const endCell = this.worldToGrid(end);

        const openSet = [startCell];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        gScore.set(this.cellToKey(startCell), 0);
        fScore.set(this.cellToKey(startCell), this.heuristic(startCell, endCell));

        while (openSet.length > 0) {
            const current = openSet.reduce((a, b) => 
                (fScore.get(this.cellToKey(a)) || Infinity) < (fScore.get(this.cellToKey(b)) || Infinity) ? a : b
            );

            if (current.row === endCell.row && current.col === endCell.col) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.splice(openSet.indexOf(current), 1);

            for (const neighbor of this.getNeighbors(current)) {
                const tentativeGScore = (gScore.get(this.cellToKey(current)) || 0) + 1;

                if (tentativeGScore < (gScore.get(this.cellToKey(neighbor)) || Infinity)) {
                    cameFrom.set(this.cellToKey(neighbor), current);
                    gScore.set(this.cellToKey(neighbor), tentativeGScore);
                    fScore.set(this.cellToKey(neighbor), tentativeGScore + this.heuristic(neighbor, endCell));

                    if (!openSet.some(cell => cell.row === neighbor.row && cell.col === neighbor.col)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return null; // No path found
    }

    getNeighbors(cell) {
        const neighbors = [];
        const directions = [
            { row: -1, col: 0 }, { row: 1, col: 0 },
            { row: 0, col: -1 }, { row: 0, col: 1 }
        ];

        for (const dir of directions) {
            const newRow = cell.row + dir.row;
            const newCol = cell.col + dir.col;

            if (newRow >= 0 && newRow < this.grid.length &&
                newCol >= 0 && newCol < this.grid[0].length &&
                this.grid[newRow][newCol].walkable) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }

        return neighbors;
    }

    heuristic(a, b) {
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    }

    reconstructPath(cameFrom, current) {
        const path = [this.gridToWorld(current)];
        while (cameFrom.has(this.cellToKey(current))) {
            current = cameFrom.get(this.cellToKey(current));
            path.unshift(this.gridToWorld(current));
        }
        return path;
    }

    worldToGrid(position) {
        return {
            row: Math.floor(position.z / config.cellSize),
            col: Math.floor(position.x / config.cellSize)
        };
    }

    gridToWorld(cell) {
        return new THREE.Vector3(
            cell.col * config.cellSize + config.cellSize / 2,
            0,
            cell.row * config.cellSize + config.cellSize / 2
        );
    }

    cellToKey(cell) {
        return `${cell.row},${cell.col}`;
    }

    cost(nodeA, nodeB) {
        // Simple cost function: Euclidean distance
        return nodeA.position.distanceTo(nodeB.position);
    }
}

