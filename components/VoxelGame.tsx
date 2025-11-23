import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ElementType, ELEMENTS } from '../types';
import { generateVoxelStructure } from '../services/geminiService';
import { UIOverlay, ToolType, GameMode } from './UIOverlay';

// --- Constants ---
const GRID_W = 180;
const GRID_H = 180;
const TOTAL_CELLS = GRID_W * GRID_H;

// Player Physics Constants (Adjusted for higher resolution)
const PLAYER_SIZE = { w: 2, h: 3.5 }; // Size in grid cells
const GRAVITY = 0.05;
const JUMP_FORCE = 0.8;
const MOVE_SPEED = 0.4;
const FRICTION = 0.8;
const WATER_DRAG = 0.85;
const WATER_BUOYANCY = 0.02;

// Map Element ID to Integer ID for Fast Array Access
const TYPE_MAP: Record<ElementType, number> = {
  'AIR': 0,
  'SAND': 1,
  'WATER': 2,
  'STONE': 3,
  'WOOD': 4,
  'FIRE': 5
};

const COLORS_INT = new Uint32Array(Object.keys(TYPE_MAP).length + 1);
// Precompute Integer Colors (0xRRGGBB)
ELEMENTS.forEach(el => {
  const c = new THREE.Color(el.color);
  COLORS_INT[TYPE_MAP[el.id]] = c.getHex();
});

// --- Helper Components ---

function InputController({ 
    tool, 
    onZoomRef, 
    gameMode 
}: { 
    tool: ToolType, 
    onZoomRef: React.MutableRefObject<((d: number) => void) | null>,
    gameMode: GameMode
}) {
    const { camera, gl } = useThree();
    const lastPos = useRef<{x: number, y: number} | null>(null);
    const lastDist = useRef<number | null>(null);

    useEffect(() => {
        onZoomRef.current = (delta: number) => {
            const zoomSpeed = 5;
            camera.zoom = Math.max(5, Math.min(100, camera.zoom + delta * zoomSpeed));
            camera.updateProjectionMatrix();
        };
    }, [camera, onZoomRef]);

    useEffect(() => {
        const canvas = gl.domElement;

        const handleTouchStart = (e: TouchEvent) => {
            if (gameMode === 'play') {
                // Only allow pinch zoom in play mode, no pan
                if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    lastDist.current = Math.sqrt(dx*dx + dy*dy);
                }
                return; 
            }

            if (e.touches.length === 1 && tool === 'hand') {
                lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastDist.current = Math.sqrt(dx*dx + dy*dy);
                const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                lastPos.current = { x: cx, y: cy };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
             if(e.cancelable) e.preventDefault();

             // Zoom logic (Always active for 2 fingers)
             if (e.touches.length === 2 && lastDist.current) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const delta = dist - lastDist.current;
                const zoomSpeed = 0.15;
                camera.zoom = Math.max(5, Math.min(100, camera.zoom + delta * zoomSpeed));
                camera.updateProjectionMatrix();
                lastDist.current = dist;
             }

             if (gameMode === 'play') return; // Disable manual pan in play mode

             if (lastPos.current) {
                 let cx = 0, cy = 0;
                 let isPanning = false;

                 if (e.touches.length === 1 && tool === 'hand') {
                     cx = e.touches[0].clientX;
                     cy = e.touches[0].clientY;
                     isPanning = true;
                 } else if (e.touches.length === 2) {
                     cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                     cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                     isPanning = true;
                 }

                 if (isPanning) {
                     const dx = cx - lastPos.current.x;
                     const dy = cy - lastPos.current.y;
                     const zoomFactor = 1 / camera.zoom; 
                     camera.position.x -= dx * zoomFactor;
                     camera.position.y += dy * zoomFactor;
                     lastPos.current = { x: cx, y: cy };
                 }
             }
        };

        const handleTouchEnd = () => { lastPos.current = null; lastDist.current = null; };

        const handleMouseDown = (e: MouseEvent) => {
            if (gameMode === 'play') return;
            if (tool === 'hand' || e.button === 1) {
                lastPos.current = { x: e.clientX, y: e.clientY };
            }
        };
        const handleMouseMove = (e: MouseEvent) => {
             if (gameMode === 'play') return;
             if (lastPos.current) {
                 const dx = e.clientX - lastPos.current.x;
                 const dy = e.clientY - lastPos.current.y;
                 const zoomFactor = 1 / camera.zoom;
                 camera.position.x -= dx * zoomFactor;
                 camera.position.y += dy * zoomFactor;
                 lastPos.current = { x: e.clientX, y: e.clientY };
             }
        };
        const handleMouseUp = () => { lastPos.current = null; };
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomSpeed = 1;
            camera.zoom = Math.max(5, Math.min(100, camera.zoom - Math.sign(e.deltaY) * zoomSpeed));
            camera.updateProjectionMatrix();
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('wheel', handleWheel);
        }
    }, [camera, gl, tool, gameMode]);
    return null;
}

// --- Simulation Engine ---

function SimulationScene({ 
    selectedElement, 
    tool, 
    isGenerating, 
    onUpdateCount,
    genRequest,
    onGenComplete,
    gameMode,
    inputRef
}: { 
    selectedElement: ElementType, 
    tool: ToolType, 
    isGenerating: boolean,
    onUpdateCount: (c: number) => void,
    genRequest: { blocks: any[] } | null,
    onGenComplete: () => void,
    gameMode: GameMode,
    inputRef: React.MutableRefObject<{ left: boolean, right: boolean, jump: boolean }>
}) {
    const { camera } = useThree();
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const playerMeshRef = useRef<THREE.Mesh>(null);
    const frameCountRef = useRef(0);
    
    // 1D arrays for state. Single buffer for better physics.
    const grid = useRef(new Uint8Array(TOTAL_CELLS)); 
    const updated = useRef(new Uint8Array(TOTAL_CELLS)); // Track updates per frame
    
    // Track what is currently on the GPU
    const renderedGrid = useRef(new Uint8Array(TOTAL_CELLS).fill(255)); 
    
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const color = useMemo(() => new THREE.Color(), []);
    
    // Mouse interaction state
    const mouseRef = useRef({ x: -1, y: -1, drawing: false });

    // Player Physics State
    const player = useRef({
        x: 0, // Grid coords
        y: 20, 
        vx: 0, 
        vy: 0,
        grounded: false,
        inWater: false
    });

    // Initialize InstancedMesh positions
    useEffect(() => {
        if (!meshRef.current) return;
        // Initialize all instances to scale 0 (invisible) but correct position
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const x = i % GRID_W;
            const y = Math.floor(i / GRID_W);
            dummy.position.set(x - GRID_W/2, y - GRID_H/2, 0);
            dummy.scale.set(0, 0, 0); // Start hidden
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            meshRef.current.setColorAt(i, new THREE.Color(0,0,0));
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        renderedGrid.current.fill(255); 
    }, [dummy]);

    // Handle AI Generation Request
    useEffect(() => {
        if (genRequest && genRequest.blocks) {
            grid.current.fill(0);
            const colorToType = (hex: string): number => {
                hex = hex.toLowerCase();
                if (hex.includes('3b82f6')) return TYPE_MAP['WATER'];
                if (hex.includes('fbbf24')) return TYPE_MAP['SAND'];
                if (hex.includes('52525b')) return TYPE_MAP['STONE'];
                if (hex.includes('78350f')) return TYPE_MAP['WOOD'];
                if (hex.includes('ef4444')) return TYPE_MAP['FIRE'];
                return TYPE_MAP['STONE']; 
            };

            for (const b of genRequest.blocks) {
                let x = b.x + Math.floor(GRID_W/2);
                let y = b.y + Math.floor(GRID_H/2);
                if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
                    const idx = y * GRID_W + x;
                    grid.current[idx] = colorToType(b.color);
                }
            }
            player.current = { x: 0, y: 20, vx: 0, vy: 0, grounded: false, inWater: false };
            onGenComplete();
        }
    }, [genRequest, onGenComplete]);

    // Handle Interactions
    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (tool === 'hand' || gameMode === 'play') return;
        mouseRef.current.x = e.point.x;
        mouseRef.current.y = e.point.y;
        mouseRef.current.drawing = (e.buttons > 0 || e.nativeEvent.type === 'touchmove');
    };
    
    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (tool === 'hand' || gameMode === 'play') return;
        e.stopPropagation();
        mouseRef.current.drawing = true;
        mouseRef.current.x = e.point.x;
        mouseRef.current.y = e.point.y;
        // @ts-ignore
        e.target.setPointerCapture?.(e.pointerId);
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        mouseRef.current.drawing = false;
        // @ts-ignore
        e.target.releasePointerCapture?.(e.pointerId);
    };

    // Helper: Check collision for player
    const checkCollision = (px: number, py: number): { solid: boolean, fluid: boolean } => {
        const minX = Math.round(px + GRID_W/2 - PLAYER_SIZE.w/2);
        const maxX = Math.round(px + GRID_W/2 + PLAYER_SIZE.w/2);
        const minY = Math.round(py + GRID_H/2 - PLAYER_SIZE.h/2);
        const maxY = Math.round(py + GRID_H/2 + PLAYER_SIZE.h/2);
        
        let solid = false;
        let fluid = false;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) continue;
                const idx = y * GRID_W + x;
                const type = grid.current[idx];
                
                if (type === TYPE_MAP['STONE'] || type === TYPE_MAP['WOOD'] || type === TYPE_MAP['SAND']) {
                    solid = true;
                } else if (type === TYPE_MAP['WATER']) {
                    fluid = true;
                } else if (type === TYPE_MAP['FIRE']) {
                    player.current.x = 0;
                    player.current.y = 30;
                    player.current.vx = 0;
                    player.current.vy = 0;
                }
            }
        }
        return { solid, fluid };
    };

    // Physics Update Helpers
    const updateSand = (x: number, y: number, idx: number) => {
        if (y === 0) return;
        
        // Try Down
        const downIdx = idx - GRID_W;
        const downType = grid.current[downIdx];
        if (downType === TYPE_MAP['AIR'] || downType === TYPE_MAP['WATER']) {
            grid.current[downIdx] = TYPE_MAP['SAND'];
            grid.current[idx] = downType; // Swap (displace water)
            updated.current[downIdx] = 1;
            updated.current[idx] = 1;
            return;
        }

        // Try Diagonal
        const dir = Math.random() < 0.5 ? 1 : -1;
        const dirs = [dir, -dir];
        for (const d of dirs) {
            const nx = x + d;
            if (nx >= 0 && nx < GRID_W) {
                const diagIdx = downIdx + d;
                const diagType = grid.current[diagIdx];
                if (diagType === TYPE_MAP['AIR'] || diagType === TYPE_MAP['WATER']) {
                    grid.current[diagIdx] = TYPE_MAP['SAND'];
                    grid.current[idx] = diagType;
                    updated.current[diagIdx] = 1;
                    updated.current[idx] = 1;
                    return;
                }
            }
        }
    };

    const updateWater = (x: number, y: number, idx: number) => {
        if (y > 0) {
            const downIdx = idx - GRID_W;
            if (grid.current[downIdx] === TYPE_MAP['AIR']) {
                grid.current[downIdx] = TYPE_MAP['WATER'];
                grid.current[idx] = TYPE_MAP['AIR'];
                updated.current[downIdx] = 1;
                updated.current[idx] = 1;
                return;
            }
        }

        // Flow Sideways
        const dir = Math.random() < 0.5 ? 1 : -1;
        const dirs = [dir, -dir];
        for (const d of dirs) {
            const nx = x + d;
            if (nx >= 0 && nx < GRID_W) {
                const sideIdx = idx + d;
                // Check 'updated' to prevent infinite speed flow in one frame
                if (grid.current[sideIdx] === TYPE_MAP['AIR'] && updated.current[sideIdx] === 0) {
                    grid.current[sideIdx] = TYPE_MAP['WATER'];
                    grid.current[idx] = TYPE_MAP['AIR'];
                    updated.current[sideIdx] = 1;
                    updated.current[idx] = 1;
                    return;
                }
            }
        }
    };

    const updateFire = (x: number, y: number, idx: number) => {
        // 1. Chance to burn out (reduced to allow spreading)
        if (Math.random() < 0.03) {
            grid.current[idx] = TYPE_MAP['AIR']; 
            updated.current[idx] = 1;
            return;
        }

        let contactWater = false;

        // 2. Spread to neighbors (Ignite Wood)
        const neighbors = [
            { dx: 0, dy: 1, chance: 0.15 },  // Up (Heat rises)
            { dx: 0, dy: -1, chance: 0.01 }, // Down (Harder)
            { dx: 1, dy: 0, chance: 0.05 },  // Right
            { dx: -1, dy: 0, chance: 0.05 }  // Left
        ];

        for (const {dx, dy, chance} of neighbors) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
                const nIdx = ny * GRID_W + nx;
                const nType = grid.current[nIdx];

                if (nType === TYPE_MAP['WATER']) {
                    contactWater = true;
                } else if (nType === TYPE_MAP['WOOD']) {
                    // Ignite wood
                    if (Math.random() < chance) {
                        grid.current[nIdx] = TYPE_MAP['FIRE'];
                        updated.current[nIdx] = 1;
                    }
                }
            }
        }

        if (contactWater) {
             grid.current[idx] = TYPE_MAP['AIR']; // Extinguished
             updated.current[idx] = 1;
             return;
        }

        // 3. Move / Rise
        if (y < GRID_H - 1) {
            const upIdx = idx + GRID_W;
            const upType = grid.current[upIdx];
            
            // Move into Air
            if (upType === TYPE_MAP['AIR']) {
                grid.current[upIdx] = TYPE_MAP['FIRE'];
                grid.current[idx] = TYPE_MAP['AIR'];
                updated.current[upIdx] = 1;
                updated.current[idx] = 1;
                return;
            }
            
            // Turbulence: Move diagonally if blocked or randomly
            if (Math.random() < 0.5) {
                 const dir = Math.random() < 0.5 ? 1 : -1;
                 const nx = x + dir;
                 if (nx >= 0 && nx < GRID_W) {
                     const upSideIdx = (y + 1) * GRID_W + nx;
                     if (grid.current[upSideIdx] === TYPE_MAP['AIR']) {
                        grid.current[upSideIdx] = TYPE_MAP['FIRE'];
                        grid.current[idx] = TYPE_MAP['AIR'];
                        updated.current[upSideIdx] = 1;
                        updated.current[idx] = 1;
                     }
                 }
            }
        }
    };

    // Simulation Loop
    useFrame(() => {
        if (!meshRef.current) return;
        frameCountRef.current++;

        // --- 1. Player Physics (Only in Play Mode) ---
        if (gameMode === 'play' && playerMeshRef.current) {
            const p = player.current;
            const input = inputRef.current;

            // Horizontal
            if (input.left) p.vx -= MOVE_SPEED;
            if (input.right) p.vx += MOVE_SPEED;
            
            if (p.inWater) {
                p.vx *= WATER_DRAG;
                p.vy *= WATER_DRAG;
            } else {
                p.vx *= FRICTION;
            }

            const nextX = p.x + p.vx;
            const colX = checkCollision(nextX, p.y);
            if (colX.solid) p.vx = 0;
            else p.x = nextX;

            // Vertical
            if (p.inWater) {
                p.vy += WATER_BUOYANCY;
                if (input.jump) p.vy = 0.5;
            } else {
                p.vy -= GRAVITY;
                if (p.grounded && input.jump) {
                    p.vy = JUMP_FORCE;
                    p.grounded = false;
                }
            }

            const nextY = p.y + p.vy;
            const colY = checkCollision(p.x, nextY);
            
            p.inWater = colY.fluid;
            if (colY.solid) {
                if (p.vy < 0) p.grounded = true;
                p.vy = 0;
            } else {
                p.y = nextY;
                p.grounded = false;
            }

            if (p.y < -GRID_H/2 - 20) {
                p.x = 0; p.y = 30; p.vx = 0; p.vy = 0;
            }
            playerMeshRef.current.position.set(p.x, p.y, 1);
            
            // Smooth Camera Follow
            camera.position.x += (p.x - camera.position.x) * 0.1;
            camera.position.y += (p.y - camera.position.y) * 0.1;
        }

        // --- 2. Drawing (Only in Edit Mode) ---
        if (gameMode === 'edit' && mouseRef.current.drawing) {
            const gx = Math.round(mouseRef.current.x + GRID_W/2);
            const gy = Math.round(mouseRef.current.y + GRID_H/2);
            // Increased brush size for higher resolution grid
            const radius = tool === 'eraser' ? 6 : 3;

            for (let y = gy - radius; y <= gy + radius; y++) {
                for (let x = gx - radius; x <= gx + radius; x++) {
                    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
                        if ((x-gx)**2 + (y-gy)**2 <= radius**2) {
                            const idx = y * GRID_W + x;
                            grid.current[idx] = tool === 'eraser' ? TYPE_MAP['AIR'] : TYPE_MAP[selectedElement];
                            updated.current[idx] = 1; // Mark as updated to avoid immediate physics interaction glitches
                        }
                    }
                }
            }
        }

        // --- 3. Particle Physics Step ---
        updated.current.fill(0); // Reset update tracker

        // PASS 1: BOTTOM-UP (Gravity Elements: Sand, Water)
        for (let y = 0; y < GRID_H; y++) {
            for (let x = 0; x < GRID_W; x++) {
                const idx = y * GRID_W + x;
                if (updated.current[idx]) continue; // Skip if already moved this frame

                const type = grid.current[idx];
                if (type === TYPE_MAP['SAND']) updateSand(x, y, idx);
                else if (type === TYPE_MAP['WATER']) updateWater(x, y, idx);
            }
        }

        // PASS 2: TOP-DOWN (Rising Elements: Fire)
        for (let y = GRID_H - 1; y >= 0; y--) {
            for (let x = 0; x < GRID_W; x++) {
                 const idx = y * GRID_W + x;
                 if (updated.current[idx]) continue;
                 
                 if (grid.current[idx] === TYPE_MAP['FIRE']) updateFire(x, y, idx);
            }
        }

        // --- 4. Render Update ---
        let matrixNeedsUpdate = false;
        let colorNeedsUpdate = false;
        let activeCount = 0;

        for (let i = 0; i < TOTAL_CELLS; i++) {
            const type = grid.current[i];
            const prevType = renderedGrid.current[i];
            
            if (type !== 0) activeCount++;

            const isDynamic = (type === TYPE_MAP['FIRE'] || type === TYPE_MAP['WATER']);
            
            if (type !== prevType || isDynamic) {
                const x = i % GRID_W;
                const y = Math.floor(i / GRID_W);
                dummy.position.set(x - GRID_W/2, y - GRID_H/2, 0);

                if (type === TYPE_MAP['AIR']) {
                    dummy.scale.set(0, 0, 0);
                } else {
                    dummy.scale.set(1, 1, 1);
                }
                
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);
                matrixNeedsUpdate = true;

                if (type !== TYPE_MAP['AIR']) {
                    const hex = COLORS_INT[type];
                    color.setHex(hex);
                    
                    if (type === TYPE_MAP['FIRE']) {
                        // Dynamic Fire Color: Flicker between Red/Orange/Yellow
                        const flicker = Math.random();
                        if (flicker > 0.5) {
                            // Add green to make it orange/yellow
                            color.g = Math.min(1, color.g + Math.random() * 0.5);
                            color.r = Math.min(1, color.r + Math.random() * 0.1);
                        } else {
                            // Slightly darken or redden
                            color.r *= 0.9 + 0.1 * Math.random();
                        }
                    } else if (type === TYPE_MAP['WATER']) {
                        color.b = Math.min(1, color.b + (Math.random() - 0.5) * 0.05);
                    }
                    
                    meshRef.current.setColorAt(i, color);
                    colorNeedsUpdate = true;
                }
                
                renderedGrid.current[i] = type;
            }
        }

        if (matrixNeedsUpdate) meshRef.current.instanceMatrix.needsUpdate = true;
        if (colorNeedsUpdate) meshRef.current.instanceColor!.needsUpdate = true;
        
        // Throttle UI update to every 10 frames
        if (frameCountRef.current % 10 === 0) {
            onUpdateCount(activeCount);
        }
    });

    return (
        <group>
            {/* Invisible Plane for Raycasting */}
            <mesh 
                position={[0, 0, 0.1]} 
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <planeGeometry args={[GRID_W, GRID_H]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* The Particles */}
            <instancedMesh 
                ref={meshRef} 
                args={[undefined, undefined, TOTAL_CELLS]}
                frustumCulled={false}
            >
                <planeGeometry args={[0.9, 0.9]} />
                <meshBasicMaterial color="white" />
            </instancedMesh>
            
            {/* The Player Character */}
            {gameMode === 'play' && (
                <mesh ref={playerMeshRef} position={[0, 20, 1]}>
                    <planeGeometry args={[PLAYER_SIZE.w, PLAYER_SIZE.h]} />
                    <meshBasicMaterial color="#00ffcc" />
                    <mesh position={[0,0,-0.1]}>
                         <planeGeometry args={[PLAYER_SIZE.w * 1.5, PLAYER_SIZE.h * 1.5]} />
                         <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} />
                    </mesh>
                </mesh>
            )}
        </group>
    );
}

function GridBackground() {
    return (
        <mesh position={[0, 0, -1]}>
            <planeGeometry args={[GRID_W, GRID_H]} />
            <meshBasicMaterial color="#0f172a" />
            <gridHelper 
                args={[GRID_W, GRID_W, 0x1e293b, 0x1e293b]} 
                rotation={[Math.PI / 2, 0, 0]} 
                position={[0, 0, 0]} 
            />
        </mesh>
    );
}

// --- Main Component ---

export const VoxelGame: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<ElementType>('SAND');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [currentTool, setTool] = useState<ToolType>('brush');
  const [particleCount, setParticleCount] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('edit');
  
  // Input ref for low-latency control loop access
  const inputRef = useRef({ left: false, right: false, jump: false });
  
  const [genRequest, setGenRequest] = useState<{blocks: any[]} | null>(null);
  const zoomFnRef = useRef<((d: number) => void) | null>(null);

  const handleGenerateStructure = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const result = await generateVoxelStructure(prompt);
      if (result.blocks) {
          setGenRequest({ blocks: result.blocks });
      }
    } catch (error) {
      console.error("Failed to generate", error);
      setIsGenerating(false);
    }
  };
  
  const handleGenComplete = useCallback(() => {
      setIsGenerating(false);
      setGenRequest(null);
  }, []);

  const handleReset = () => {
      setGenRequest({ blocks: [] });
  };

  return (
    <div className="w-full h-full relative bg-slate-950 touch-none">
      <UIOverlay 
        selectedElement={selectedElement}
        onSelectElement={setSelectedElement}
        onGenerate={handleGenerateStructure}
        isGenerating={isGenerating}
        particleCount={particleCount}
        isAiModalOpen={isAiModalOpen}
        setIsAiModalOpen={setIsAiModalOpen}
        currentTool={currentTool}
        setTool={setTool}
        onZoom={(delta) => zoomFnRef.current?.(delta)}
        onReset={handleReset}
        gameMode={gameMode}
        setGameMode={setGameMode}
        inputRef={inputRef}
      />
      
      <Canvas orthographic camera={{ zoom: 10, position: [0, 0, 100] }}>
        <color attach="background" args={['#020617']} />
        
        <InputController tool={currentTool} onZoomRef={zoomFnRef} gameMode={gameMode} />
        
        <group position={[0,0,0]}>
            <GridBackground />
            <SimulationScene 
                selectedElement={selectedElement}
                tool={currentTool}
                isGenerating={isGenerating}
                onUpdateCount={setParticleCount}
                genRequest={genRequest}
                onGenComplete={handleGenComplete}
                gameMode={gameMode}
                inputRef={inputRef}
            />
        </group>

      </Canvas>
    </div>
  );
};