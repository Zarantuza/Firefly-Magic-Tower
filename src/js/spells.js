import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js'

const BLOOM_SCENE = 1;
let gameScene;


export const spells = [
    {
        name: 'Arcane Missile',
        firefliesRequired: 5,
        cost: 10,
        color: 0x00ffff,
        iconPath: 'img/spells/arcane-missile.jpg',
        speed: 15,
        scale: 0.2,
        damage: 10,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            spell.rotation.z += 10 * delta;
            // Create a spiral trail effect
            const trail = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 })
            );
            trail.position.copy(spell.position);
            spell.parent.add(trail);
            setTimeout(() => scene.remove(trail), 500);
        }
    },
    {
        name: 'Fireball',
        firefliesRequired: 20,
        cost: 25,
        color: 0xff4500,
        iconPath: 'img/spells/fireball.jpg',
        speed: 10,
        scale: 0.5,
        damage: 30,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            // Pulsating effect
            spell.scale.setScalar(0.5 + Math.sin(Date.now() * 0.01) * 0.1);
            // Emit flame particles
            if (Math.random() < 0.3) {
                const particle = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 })
                );
                particle.position.copy(spell.position).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5));
                particle.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.1);
                spell.parent.add(particle);
                setTimeout(() => scene.remove(particle), 500);
            }
        }
    },
    {
        name: 'Ice Shard',
        firefliesRequired: 35,
        cost: 15,
        color: 0x87cefa,
        iconPath: 'img/spells/ice-shard.jpg',
        speed: 20,
        scale: 0.3,
        damage: 15,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            spell.rotation.z += 15 * delta;
            // Leave behind a trail of ice crystals
            if (Math.random() < 0.2) {
                const crystal = new THREE.Mesh(
                    new THREE.OctahedronGeometry(0.1),
                    new THREE.MeshBasicMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.6 })
                );
                crystal.position.copy(spell.position);
                crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                spell.parent.add(crystal);
                setTimeout(() => {
                    new TWEEN.Tween(crystal.scale).to({ x: 0, y: 0, z: 0 }, 1000).start();
                    setTimeout(() => scene.remove(crystal), 1000);
                }, 2000);
            }
        }
    },
    {
        name: 'Lightning Bolt',
        firefliesRequired: 50,
        cost: 30,
        color: 0xffd700,
        iconPath: 'img/spells/lightning-bolt.jpg',
        speed: 25,
        scale: 0.1,
        damage: 40,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            
            // Create a symmetrical zigzag path
            const time = Date.now() * 0.005;
            const amplitude = 0.5;
            const frequency = 2;
            spell.position.y += Math.sin(time * frequency) * amplitude * delta;
            spell.position.x += Math.cos(time * frequency) * amplitude * delta;
            
            // Rotate the spell for added dynamism
            spell.rotation.z += 10 * delta;
            
            // Pulsating effect
            const pulseScale = 1 + Math.sin(time * 3) * 0.2;
            spell.scale.set(pulseScale, pulseScale, pulseScale);
            
            // Flicker effect
            spell.material.opacity = Math.random() * 0.3 + 0.7;
            
            // Create electric arcs
            const arcCount = 4;
            for (let i = 0; i < arcCount; i++) {
                const arc = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.02, 1),
                    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.7 })
                );
                const angle = (i / arcCount) * Math.PI * 2 + time;
                arc.position.copy(spell.position).add(new THREE.Vector3(
                    Math.cos(angle) * 0.5,
                    Math.sin(angle) * 0.5,
                    0
                ));
                arc.lookAt(arc.position.clone().add(spell.velocity));
                spell.parent.add(arc);
                
                // Animate arc
                new TWEEN.Tween(arc.scale)
                    .to({ x: 0, y: 0, z: 0 }, 200)
                    .easing(TWEEN.Easing.Exponential.Out)
                    .start();
                    setTimeout(() => scene.remove(arc), 200);
            }
            
            // Emit particles
            if (Math.random() < 0.3) {
                const particle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05),
                    new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 })
                );
                particle.position.copy(spell.position);
                particle.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).multiplyScalar(0.2);
                spell.parent.add(particle);
                
                // Animate particle
                new TWEEN.Tween(particle.scale)
                    .to({ x: 0, y: 0, z: 0 }, 500)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();
                    setTimeout(() => scene.remove(particle), 500);
            }
        }
    },
    {
        name: 'Poison Cloud',
        firefliesRequired: 75,
        cost: 35,
        color: 0x32cd32,
        iconPath: 'img/spells/poison-cloud.jpg',
        speed: 5,
        scale: 0.5,
        damage: 20,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            // Swirling effect
            spell.rotation.y += delta;
            spell.scale.addScalar(delta * 0.5);
            spell.material.opacity -= delta * 0.1;
            // Emit toxic particles
            if (Math.random() < 0.2) {
                const particle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05),
                    new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 })
                );
                particle.position.copy(spell.position).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(spell.scale.x));
                particle.scale.setScalar(Math.random() * 0.5 + 0.5);
                spell.parent.add(particle);
                new TWEEN.Tween(particle.scale).to({ x: 0, y: 0, z: 0 }, 2000).start();
                setTimeout(() => scene.remove(particle), 5000);
            }
        }
    },
    {
        name: 'Soul Drain',
        firefliesRequired: 100,
        cost: 40,
        color: 0x800080,
        iconPath: 'img/spells/soul-drain.jpg',
        speed: 8,
        scale: 0.4,
        damage: 25,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            // Ethereal wisps orbiting the main spell
            for (let i = 0; i < 3; i++) {
                const angle = Date.now() * 0.003 + i * Math.PI * 2 / 3;
                const wisp = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05),
                    new THREE.MeshBasicMaterial({ color: 0xd8bfd8, transparent: true, opacity: 0.7 })
                );
                wisp.position.copy(spell.position).add(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(0.3));
                spell.parent.add(wisp);
                setTimeout(() => scene.remove(wisp), 100);
            }
            // Pulsating effect
            spell.scale.setScalar(0.4 + Math.sin(Date.now() * 0.01) * 0.1);
        }
    },
    {
        name: 'Earth Spike',
        firefliesRequired: 150,
        cost: 45,
        color: 0x8b4513,
        iconPath: 'img/spells/earth-spike.jpg',
        speed: 12,
        scale: 0.6,
        damage: 35,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            // Rotate and grow as it travels
            spell.rotation.x += 5 * delta;
            spell.scale.y += delta;
            // Leave a trail of small rocks
            if (Math.random() < 0.3) {
                const rock = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.1),
                    new THREE.MeshBasicMaterial({ color: 0x8b4513 })
                );
                rock.position.copy(spell.position).add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(0.2));
                rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                spell.parent.add(rock);
                new TWEEN.Tween(rock.position).to({ y: rock.position.y - 1 }, 1000).start();
                setTimeout(() => scene.remove(rock), 150);
            }
        }
    },
    {
        name: 'Wind Slash',
        firefliesRequired: 200,
        cost: 20,
        color: 0xf0f8ff,
        iconPath: 'img/spells/wind-slash.jpg',
        speed: 30,
        scale: 0.7,
        damage: 15,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            // Create a slashing motion
            spell.rotation.z += 10 * delta;
            spell.scale.x = Math.sin(spell.position.length() * 5) * 0.5 + 1;
            // Add wind particle effects
            if (Math.random() < 0.5) {
                const particle = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.1, 0.1),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
                );
                particle.position.copy(spell.position).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5));
                particle.lookAt(particle.position.clone().add(spell.velocity));
                spell.parent.add(particle);
                new TWEEN.Tween(particle.scale).to({ x: 0, y: 0, z: 0 }, 500).start();
                setTimeout(() => scene.remove(particle), 500);
            }
        }
    },
    {
        name: 'Holy Nova',
        firefliesRequired: 300,
        cost: 60,
        color: 0xfffacd,
        iconPath: 'img/spells/holy-nova.jpg',
        speed: 0,
        scale: 0.1,
        damage: 50,
        behavior: (spell, delta, scene) => {
            // Expand outward
            spell.scale.addScalar(delta * 5);
            spell.material.opacity -= delta * 0.5;
            // Create shimmering light particles
            for (let i = 0; i < 5; i++) {
                const particle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.05),
                    new THREE.MeshBasicMaterial({ color: 0xfffacd, transparent: true, opacity: 0.7 })
                );
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * spell.scale.x;
                particle.position.set(
                    spell.position.x + Math.cos(angle) * radius,
                    spell.position.y + Math.sin(angle) * radius,
                    spell.position.z
                );
                spell.parent.add(particle);
                new TWEEN.Tween(particle.position).to({
                    x: particle.position.x + Math.random() - 0.5,
                    y: particle.position.y + Math.random() - 0.5,
                    z: particle.position.z + Math.random() - 0.5
                }, 1000).start();
                setTimeout(() => scene.remove(particle), 1000);
            }
        }
    },
    {
        name: 'Void Rift',
        firefliesRequired: 500,
        cost: 100,
        color: 0x000000,
        iconPath: 'img/spells/void-rift.jpg',
        speed: 2,
        scale: 0.8,
        damage: 100,
        behavior: (spell, delta, scene) => {
            spell.position.add(spell.velocity.clone().multiplyScalar(delta));
            // Create a swirling, pulsating effect
            spell.rotation.y += 2 * delta;
            spell.scale.addScalar(Math.sin(spell.position.length() * 2) * delta);
            // Add gravitational pull effect
            const pullRadius = spell.scale.x * 2;
            spell.parent.children.forEach(child => {
                if (child !== spell && child.position.distanceTo(spell.position) < pullRadius) {
                    const pullForce = new THREE.Vector3().subVectors(spell.position, child.position);
                    child.position.add(pullForce.multiplyScalar(delta * 0.1));
                }
            });
            // Emit void particles
            if (Math.random() < 0.2) {
                const particle = new THREE.Mesh(
                    new THREE.TetrahedronGeometry(0.1),
                    new THREE.MeshBasicMaterial({ color: 0x4b0082, transparent: true, opacity: 0.8 })
                );
                particle.position.copy(spell.position).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(spell.scale.x));
                particle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                spell.parent.add(particle);
                new TWEEN.Tween(particle.scale).to({ x: 0, y: 0, z: 0 }, 2000).easing(TWEEN.Easing.Quintic.In).start();
                setTimeout(() => scene.remove(particle), 800);
            }
        }
    }
];

export function getAvailableSpell(fireflyCount) {
    for (let i = spells.length - 1; i >= 0; i--) {
        if (fireflyCount >= spells[i].firefliesRequired) {
            return spells[i];
        }
    }
    return null;
}

export function shootSpell(character, scene, collidableObjects, camera, verticalCorrection, shootSourceHeight, debugHelpers, fireflyCount, spell, enemies) {

    gameScene = scene;

    if (!spell) {
        ////////////console.warn('No spell available.');
        return null;
    }

    const spellGeometry = new THREE.SphereGeometry(spell.scale, 32, 32);
    const spellMaterial = new THREE.MeshStandardMaterial({
        color: spell.color,
        emissive: spell.color,
        emissiveIntensity: 1.5,
        opacity: 0.8,
        transparent: true
    });

    const spellMesh = new THREE.Mesh(spellGeometry, spellMaterial);
    spellMesh.layers.enable(BLOOM_SCENE);

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y += verticalCorrection;
    spellMesh.position.copy(character.position).add(new THREE.Vector3(0, shootSourceHeight, 0)).add(forward.clone().multiplyScalar(1));
    spellMesh.velocity = forward.clone().multiplyScalar(spell.speed);

    scene.add(spellMesh);

    const spellBoxHelper = new THREE.BoxHelper(spellMesh, spell.color);
    debugHelpers.push(spellMesh);
    debugHelpers.push(spellBoxHelper);

    let collisionOccurred = false;
    let collisionTime = 0;

    const spellAnimation = (delta) => {
        if (!collisionOccurred) {
            spell.behavior(spellMesh, delta, gameScene);
            spellBoxHelper.update();

            // Check for collisions with enemies
            if (enemies && Array.isArray(enemies)) {
                const spellBox = new THREE.Box3().setFromObject(spellMesh);
                enemies.forEach(enemy => {
                    if (enemy.mesh) {
                        const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);
                        if (spellBox.intersectsBox(enemyBox)) {
                            enemy.takeDamage(spell.damage);
                            collisionOccurred = true;
                            //////////console.log(`Spell hit ${enemy.type} enemy for ${spell.damage} damage`);
                        }
                    }
                });
            }

            if (checkCollisions(spellMesh.velocity.clone().multiplyScalar(delta), collidableObjects, spellMesh)) {
                collisionOccurred = true;
                collisionTime = 0;
            }
        } else {
            collisionTime += delta;
            const spellScale = spell.scale * (1 - collisionTime / 0.5);
            spellMesh.scale.set(spellScale, spellScale, spellScale);

            if (collisionTime >= 0.5) {
                cleanupSpell(spellMesh, spellBoxHelper, gameScene);
                return false;
            }
        }

        return true;
    };

    return spellAnimation;
}

function cleanupSpell(spellMesh, spellBoxHelper, scene) {
    // Supprimez tous les enfants du sort (particules, effets, etc.)
    while (spellMesh.children.length > 0) {
        scene.remove(spellMesh.children[0]);
    }
    
    // Supprimez le sort et son helper de la scène
    scene.remove(spellMesh);
    scene.remove(spellBoxHelper);
}

function checkCollisions(direction, collidableObjects, spell) {
    const spellBox = new THREE.Box3().setFromObject(spell);
    const predictedBox = spellBox.clone().translate(direction);

    for (let i = 0; i < collidableObjects.length; i++) {
        const obj = collidableObjects[i];
        if (!obj || !obj.geometry) continue;

        if (obj.userData && obj.userData.isCollectible) continue;

        const objectBox = new THREE.Box3().setFromObject(obj);
        if (predictedBox.intersectsBox(objectBox)) {
            return true;
        }
    }

    return false;
}