// main.js
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { StockBlock } from './StockBlock.js';
import { initAdjustmentController } from './adjustmentController.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0E1324); 

// เพิ่มหมอกสีเดียวกับพื้นหลังเพื่อให้ขอบดูนุ่มนวล
scene.fog = new THREE.FogExp2(0x0E1324, 0.008);

const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 50; 
const camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 0.1, 1000);

// มุมมองสูงแบบ Isometric นิดๆ เพื่อให้เห็นมิติของชั้นวาง
camera.position.set(15, 50, 15); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ใช้ Shadow แบบนุ่มนวล
// document.body.appendChild(renderer.domElement);
document.getElementById("three-container").appendChild(renderer.domElement);


const controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false; 
controls.enableDamping = true;

// --- Lighting ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
// ตั้งค่าความละเอียดเงา
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

// --- Floor (พื้นหลังสีเข้ม) ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400), 
    new THREE.MeshStandardMaterial({ color: 0x1a1f30, roughness: 0.8 })
);
floor.rotation.x = -Math.PI / 2; 
floor.receiveShadow = true; 
scene.add(floor);

// --- Grid (ลายกริดขาวอ่อนๆ) ---
// พารามิเตอร์: ขนาดรวม, จำนวนช่อง, สีเส้นหลัก, สีเส้นย่อย
const gridHelper = new THREE.GridHelper(400, 100, 0xffffff, 0xffffff);
gridHelper.position.y = 0.02; // ให้อยู่เหนือพื้นนิดเดียวเพื่อไม่ให้ภาพกระพริบ (Z-fighting)
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.1; // ปรับค่าความจางที่นี่ (0.1 = ขาวอ่อนๆ)
scene.add(gridHelper);

// ==========================================
// Generate Warehouse
// ==========================================
const shelfHitZones = [];
const spacingX = 18; 
const spacingZ = 16; 

for (let i = 0; i < 7; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const block = new StockBlock((col - 1) * spacingX, (row - 1) * spacingZ);
    scene.add(block.group);
    
    // เก็บ Hit Zone ของแต่ละชั้นวางไว้ใช้ตรวจจับเมาส์
    shelfHitZones.push(...block.shelfHitZones);
}

// ==========================================
// Interaction Logic
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentHovered = null;

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shelfHitZones);

    let found = intersects.length > 0 ? intersects[0].object : null;

    if (found !== currentHovered) {
        if (currentHovered) StockBlock.hoverEffect(currentHovered, false);
        if (found) StockBlock.hoverEffect(found, true);
        currentHovered = found;
        document.body.style.cursor = found ? 'pointer' : 'default';
    }

    renderer.render(scene, camera);
}

window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shelfHitZones);

    if (intersects.length > 0) {
        const clickedShelf = intersects[0].object;
        
        const shelfData = {
            name: clickedShelf.name || "A1",
            id: clickedShelf.userData.id || "ST-001",
            location: "Zone A - Warehouse 1",
            current: Math.floor(Math.random() * 45), // จำลองจำนวนสินค้า
            max: 50
        };

        // เรียกฟังก์ชันเปิด Side Panel ทันที
        if (window.showShelfDetails) {
            window.showShelfDetails(shelfData);
        }
    }
});

// 2. เรียกใช้งานฟังก์ชัน
initAdjustmentController(camera, raycaster, mouse, shelfHitZones);

animate();