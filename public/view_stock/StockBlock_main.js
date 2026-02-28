import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { StockBlock } from './StockBlock.js';

// ==========================================
// 1. Scene, Camera, Renderer
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0E1324); 
scene.fog = new THREE.FogExp2(0x0E1324, 0.008);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);

// CHANGED: Bring the camera much closer for the initial load
// (x: 0, y: 50, z: 70) gives a nice isometric-style close-up angle
camera.position.set(0, 50, 70); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; 
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("three-container").appendChild(renderer.domElement);

// ==========================================
// 2. Controls & Environment
// ==========================================
const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false; controls.enablePan = true; controls.enableZoom = true;    
// Increased maxDistance to allow zooming out further
controls.minDistance = 20; controls.maxDistance = 250;     

const ambientLight = new THREE.AmbientLight(0x333333, 0.4); 
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8); 
dirLight.position.set(20, 50, 30); 
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.top = 60;
dirLight.shadow.camera.bottom = -60;
dirLight.shadow.camera.left = -60;
dirLight.shadow.camera.right = 60;
dirLight.shadow.bias = -0.0005; 
scene.add(dirLight);

const floorGeo = new THREE.PlaneGeometry(400, 400); 
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x1a1f30,  
    roughness: 0.8,   
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; 
floor.receiveShadow = true; 
scene.add(floor);

const gridHelper = new THREE.GridHelper(400, 200, 0x304060, 0x2a3550);
gridHelper.position.y = 0.01; 
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.2; 
scene.add(gridHelper);

// ==========================================
// 3. Generate Warehouse
// ==========================================
const stockZones = []; 
const spacingX = 15; 
const spacingZ = 14; 

const stockCountFromDB = 10;

const columnsPerRow = Math.ceil(Math.sqrt(stockCountFromDB)); 
const totalRows = Math.ceil(stockCountFromDB / columnsPerRow);

for (let i = 0; i < stockCountFromDB; i++) {
    const col = i % columnsPerRow;
    const row = Math.floor(i / columnsPerRow);

    const posX = (col - (columnsPerRow - 1) / 2) * spacingX;
    const posZ = (row - (totalRows - 1) / 2) * spacingZ;

	// สร้าง ID ไม่ให้ซ้ำกัน (สำหรับเทส)
    const stock_id = i + 1; 
    const stockBlock = new StockBlock(posX, posZ, stock_id);
    scene.add(stockBlock.group);
    stockZones.push(stockBlock.hitZone);
}

// ==========================================
// 4. Raycaster & Events
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentHoveredStock = null; 

// Expanded Panning Limits to cover the 100-block footprint
const minPan = new THREE.Vector3(-100, 0, -200); 
const maxPan = new THREE.Vector3(100, 0, 200);

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

let mouseDownPosition = new THREE.Vector2();
window.addEventListener('mousedown', (event) => {
    mouseDownPosition.x = event.clientX;
    mouseDownPosition.y = event.clientY;
});

window.addEventListener('mouseup', (event) => {
    const moveDistance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPosition.x, 2) + 
        Math.pow(event.clientY - mouseDownPosition.y, 2)
    );

    if (moveDistance > 5) return; // เป็นการลากหน้าจอ

    // NEW: Prevent closing if clicking on the HTML UI (like inside the right tab)
    if (event.target.tagName !== 'CANVAS') return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stockZones);

    if (intersects.length > 0) {
        const clickedStock = intersects[0].object.userData.stockInstance;
        
        // ส่งข้อมูลเข้าไปที่ฟังก์ชันที่อยู่ใน index.ejs
        if(window.openStockPopup) {
            // จำลองข้อมูล for testing only!
            const randomCurrent = Math.floor(Math.random() * 50) + 1;
            window.openStockPopup({
                name: 'A' + clickedStock.id,
                id: 'ST-A' + String(clickedStock.id).padStart(3, '0'),
                type: 'RAM',
                location: 'WH1-S1-A' + clickedStock.id,
                current: randomCurrent,
                max: 50
            });
        }
    } else {
        // Clicked on empty space in the 3D world
        if(window.closePopup) {
            window.closePopup(); // Closes the left popup
        }
        if(window.closeDetailPanel) {
            window.closeDetailPanel(); // Closes the right panel
        }
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update(); 

    const clampedTarget = controls.target.clone().clamp(minPan, maxPan);
    if (!clampedTarget.equals(controls.target)) {
        const delta = clampedTarget.clone().sub(controls.target);
        controls.target.copy(clampedTarget);
        camera.position.add(delta);
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stockZones);

    let newlyHoveredStock = null;
    if (intersects.length > 0) {
        newlyHoveredStock = intersects[0].object.userData.stockInstance;
    }

    if (newlyHoveredStock !== currentHoveredStock) {
        if (currentHoveredStock) {
            currentHoveredStock.hoverOut();
            document.body.style.cursor = 'default';
        }
        if (newlyHoveredStock) {
             newlyHoveredStock.hoverIn();
             document.body.style.cursor = 'pointer';
        }
        currentHoveredStock = newlyHoveredStock;
    }

    renderer.render(scene, camera);
}

animate();