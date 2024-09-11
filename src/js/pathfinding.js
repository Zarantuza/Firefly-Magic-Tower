import * as THREE from 'three';

class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(element, priority) {
        this.elements.push({ element, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.elements.shift().element;
    }

    isEmpty() {
        return this.elements.length === 0;
    }
}

export function aStar(navMesh, start, goal) {
    const frontier = new PriorityQueue();
    frontier.enqueue(start, 0);
    const cameFrom = new Map();
    const costSoFar = new Map();
    cameFrom.set(start, null);
    costSoFar.set(start, 0);

    while (!frontier.isEmpty()) {
        const current = frontier.dequeue();

        if (current === goal) {
            break;
        }

        for (const next of navMesh.getNeighbors(current)) {
            const newCost = costSoFar.get(current) + navMesh.cost(current, next);
            if (!costSoFar.has(next) || newCost < costSoFar.get(next)) {
                costSoFar.set(next, newCost);
                const priority = newCost + heuristic(next, goal);
                frontier.enqueue(next, priority);
                cameFrom.set(next, current);
            }
        }
    }

    return reconstructPath(cameFrom, start, goal);
}

function heuristic(a, b) {
    return a.position.distanceTo(b.position);
}

function reconstructPath(cameFrom, start, goal) {
    let current = goal;
    const path = [];
    while (current !== start) {
        path.push(current.position);
        current = cameFrom.get(current);
    }
    path.push(start.position);
    return path.reverse();
}