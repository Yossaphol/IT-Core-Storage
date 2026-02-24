// main.js
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { StockBlock } from './StockBlock.js';

// ==========================================
// 1. Scene, Camera, Renderer
// ==========================================
const scene = new THREE.Scene();
// กำหนดสีพื้นหลังเป็นสีน้ำเงินเข้มตามที่ต้องการ
scene.background = new THREE.Color(0x0E1324); 

// เพิ่มหมอก (Fog) สีเดียวกับพื้นหลัง เพื่อให้ขอบโกดังดูจางหายไปในความมืดอย่างนุ่มนวล
scene.fog = new THREE.FogExp2(0x0E1324, 0.008);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(25, 60, 35); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; 
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("three-container").appendChild(renderer.domElement);

// ==========================================
// 2. Controls & Environment (ปรับแสงสีใหม่หมด)
// ==========================================
const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false; controls.enablePan = true; controls.enableZoom = true;    
controls.minDistance = 20; controls.maxDistance = 85;     

// --- Lighting for Dark Mode ---

// แสงบรรยากาศ (Ambient): ต้องมืดลงมากๆ ใช้สีเทาเข้ม เพื่อให้ส่วนเงาดูมีความลึก
const ambientLight = new THREE.AmbientLight(0x333333, 0.4); 
scene.add(ambientLight);

// แสงหลัก (Directional): เพิ่มความเข้มขึ้น เพื่อให้เกิด Contrast สูง (Highlights สว่างๆ)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8); // เพิ่ม intensity เป็น 1.8
dirLight.position.set(20, 50, 30); // ขยับมุมไฟนิดหน่อยให้เงาพาดสวยขึ้น
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.top = 60;
dirLight.shadow.camera.bottom = -60;
dirLight.shadow.camera.left = -60;
dirLight.shadow.camera.right = 60;
dirLight.shadow.bias = -0.0005; 
scene.add(dirLight);

// พื้น (Floor): เปลี่ยนจาก ShadowMaterial ใสๆ เป็นพื้นสีเข้มที่รับแสงเงาได้จริง
const floorGeo = new THREE.PlaneGeometry(400, 400); // ขยายพื้นให้ใหญ่ขึ้น
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x1a1f30,  // สีพื้นเทาเข้มอมน้ำเงิน (สว่างกว่า BG นิดเดียว)
    roughness: 0.8,   // พื้นด้านๆ เหมือนคอนกรีต
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; 
floor.receiveShadow = true; 
scene.add(floor);

// ตาราง (Grid): เปลี่ยนสีเส้นให้เป็นสีฟ้าอ่อนๆ สว่างๆ เพื่อให้ตัดกับพื้นสีเข้ม
const gridHelper = new THREE.GridHelper(400, 200, 0x304060, 0x2a3550);
gridHelper.position.y = 0.01; 
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.2; // จางลงนิดนึงไม่ให้แย่งซีน
scene.add(gridHelper);

// ==========================================
// 3. Generate Warehouse (Dynamic Loop)
// ==========================================
const stockZones = []; 
const spacingX = 15; 
const spacingZ = 14; 

const stockCountFromDB = 7; // จำนวนล็อกจำลอง
const columnsPerRow = 3; 
const totalRows = Math.ceil(stockCountFromDB / columnsPerRow);

for (let i = 0; i < stockCountFromDB; i++) {
    const col = i % columnsPerRow;
    const row = Math.floor(i / columnsPerRow);

    const posX = (col - (columnsPerRow - 1) / 2) * spacingX;
    const posZ = (row - (totalRows - 1) / 2) * spacingZ;

    const stockBlock = new StockBlock(posX, posZ);
    
    scene.add(stockBlock.group);
    stockZones.push(stockBlock.hitZone);
}

// ==========================================
// 4. Raycaster, Limits & Animation Loop
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentHoveredStock = null; 

const minPan = new THREE.Vector3(-40, 0, -40); // ขยายขอบเขตแพนออกไปนิดหน่อยตามขนาดพื้น
const maxPan = new THREE.Vector3(40, 0, 40);

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
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