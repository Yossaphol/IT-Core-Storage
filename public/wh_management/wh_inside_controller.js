// main.js
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { StockBlock } from './wh_inside_model.js';

// ==========================================
// 1. Scene, Camera, Renderer
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0E1324); 

/**
 * เปลี่ยนจาก PerspectiveCamera เป็น OrthographicCamera 
 * เพื่อให้ภาพแบนราบ (Flat) ไม่มีมุมเอียงของวัตถุ
 */
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 60; // ขนาดพื้นที่การมองเห็น (ปรับค่านี้เพื่อซูมเข้า/ออก)
const activeWarehouseId = document.getElementById("activeWarehouseId").value;
const stockZones = [];
const spacingX = 15;
const spacingZ = 14;
let selectedStock = null;

const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2, 
    frustumSize * aspect / 2, 
    frustumSize / 2, 
    frustumSize / -2, 
    1, 
    1000
);

// ปรับตำแหน่งกล้องให้สูงขึ้นและอยู่ตรงกลาง (X และ Z ใกล้ 0 เพื่อให้มองตรงลงไป)
camera.position.set(0, 100, 0); 
camera.lookAt(0, 0, 0);

const container = document.getElementById("warehouse-inside");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x0E1324, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);
renderer.setSize(container.clientWidth, container.clientHeight);

// ==========================================
// 2. Controls & Environment
// ==========================================
const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false; // ปิดการหมุนเพื่อคงความแบน
controls.enablePan = true; 
controls.enableZoom = true;    

// สำหรับ OrthographicCamera จะใช้การเปลี่ยนค่า Zoom ของตัวกล้องแทนระยะทาง
controls.minZoom = 0.5; 
controls.maxZoom = 3.0;

// --- Lighting ---
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

// Floor
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

// Grid
const gridHelper = new THREE.GridHelper(400, 200, 0x304060, 0x2a3550);
gridHelper.position.y = 0.01; 
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.2;
scene.add(gridHelper);

// ==========================================
// 3. Generate Warehouse
// ==========================================
async function loadStocks() {
  try {
    const response = await fetch(`/api/warehouses/${activeWarehouseId}/stocks`);
    const stocks = await response.json();

    const columnsPerRow = 3;
    const totalRows = Math.ceil(stocks.length / columnsPerRow);

    stocks.forEach((stock, i) => {

    const col = i % columnsPerRow;
    const row = Math.floor(i / columnsPerRow);

    const posX = (col - (columnsPerRow - 1) / 2) * spacingX;
    const posZ = (row - (totalRows - 1) / 2) * spacingZ;

    const stockBlock = new StockBlock(
        posX,
        posZ,
        stock.stock_id,
        stock.stock_name,
        stock.current_amount
    );
      scene.add(stockBlock.group);
      stockZones.push(stockBlock.hitZone);

    });

  } catch (err) {
    console.error("Load stock error:", err);
  }
}

// ==========================================
// 4. Raycaster & Animation Loop
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentHoveredStock = null; 

const panLimit = 25;

const minPan = new THREE.Vector3(-panLimit, 0, -panLimit);
const maxPan = new THREE.Vector3(panLimit, 0, panLimit);

window.addEventListener('mousemove', (event) => {
    const rect = container.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
});

window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    const aspect = width / height;

    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

renderer.domElement.addEventListener('mouseup', (event) => {

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stockZones);

    if (intersects.length === 0) {
        hideStockLabel();
        return;
    }

    const userData = intersects[0].object.userData;

    if (userData.stockInstance) {
        selectedStock = userData;
        showStockLabel(userData.stockInstance);
    }
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

const stockLabel = document.getElementById('stock-label');
const stockLabelText = document.getElementById('stock-label-text');

function showStockLabel(stockInstance) {

    const vector = new THREE.Vector3();
    vector.setFromMatrixPosition(stockInstance.group.matrixWorld);

    vector.x += 6;
    vector.z -= 2;

    vector.project(camera);

    const rect = container.getBoundingClientRect();

    const x = (vector.x * 0.5 + 0.5) * rect.width;
    const y = (-vector.y * 0.5 + 0.5) * rect.height;

    stockLabelText.innerText = "สินค้าคงคลัง " + stockInstance.name;

    stockLabel.style.left = x + "px";
    stockLabel.style.top = y + "px";
    stockLabel.style.transform = "translate(-10%, -100%)";

    document.getElementById("edit-stock-link").href = `/warehouse_management/stock/edit?stock_id=${stockInstance.id}&wh_id=${activeWarehouseId}`;

    stockLabel.classList.remove("hidden");
}

function hideStockLabel() {
    stockLabel.classList.add("hidden");
}

loadStocks();
animate();