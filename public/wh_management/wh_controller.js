// main.js
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import {Warehouse_model } from './wh_model.js';
import gsap from 'gsap'; 

let currentWarehouseId = null;
const trashBtn = document.getElementById("trash");
const trash_icon = document.getElementById('trash-icon');
const popup = document.getElementById('popup');
const confirmBtn = document.getElementById('confirm');
const cancelBtn = document.getElementById('cancel');

// ==========================================
// 1. Scene, Camera, Renderer
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0E1324); 
scene.fog = new THREE.FogExp2(0x0E1324, 0.008);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(5, 60, 25); // Top-down view 

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
controls.minDistance = 20; controls.maxDistance = 85;     
controls.maxPolarAngle = Math.PI / 2 - 0.05; 

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0x333333, 0.5); 
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
// 3. Generate Warehouse & Add Button
// ==========================================
const stockZones = []; 
const spacingX = 15; 
const spacingZ = 16; // ขยายระยะห่างแนวลึก (Z) ระหว่างแถวขึ้นนิดหน่อยเพื่อรองรับรถที่ยื่นออกมา

const stockCountFromDB = 7; 
const totalItems = stockCountFromDB + 1; // รวมปุ่ม "+เพิ่ม" เข้าไปในลำดับการวาด
const columnsPerRow = 3; 
const totalRows = Math.ceil(totalItems / columnsPerRow);

// สร้าง Canvas Texture สำหรับข้อความภาษาไทย
function createAddTextTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // พื้นหลังโปร่งใส
    ctx.clearRect(0, 0, 512, 512);

    // สีและการเรืองแสง (Glow) สีนีออน
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;

    // เครื่องหมาย +
    ctx.font = 'bold 150px "Kanit", "Prompt", sans-serif';
    ctx.fillText('+', 256, 180);

    // ข้อความ 'เพิ่ม'
    ctx.font = 'bold 90px "Kanit", "Prompt", sans-serif';
    ctx.fillText('เพิ่ม', 256, 330);

    return new THREE.CanvasTexture(canvas);
}

// ดึงข้อมูลและสร้าง warehouse จาก database
async function loadWarehouses() {
  try {
    const response = await fetch("/api/warehouses");
    const warehouses = await response.json();

    const columnsPerRow = 3;
    const totalItems = warehouses.length + 1;
    const totalRows = Math.ceil(totalItems / columnsPerRow);

    warehouses.forEach((wh, i) => {

      const col = i % columnsPerRow;
      const row = Math.floor(i / columnsPerRow);

      const posX = (col - (columnsPerRow - 1) / 2) * spacingX;
      const posZ = (row - (totalRows - 1) / 2) * spacingZ;

      const warehouseModel = new Warehouse_model(posX, posZ, wh.wh_id);

      scene.add(warehouseModel.group);
      stockZones.push(warehouseModel.hitZone);
    });

    createAddButton(warehouses.length, columnsPerRow, totalRows);

  } catch (err) {
    console.error("Load warehouse error:", err);
  }
}

// สร้างพื้นที่สำหรับกดเพิ่ม warehouse
function createAddButton(index, columnsPerRow, totalRows) {

    const col = index % columnsPerRow;
    const row = Math.floor(index / columnsPerRow);

    const posX = (col - (columnsPerRow - 1) / 2) * spacingX;
    const posZ = (row - (totalRows - 1) / 2) * spacingZ;

    const addGroup = new THREE.Group();
    addGroup.position.set(posX, 0, posZ);
    addGroup.rotation.y = Math.PI / 18;

    const blockWidth = 11.0;
    const blockDepth = 14.0;

    const hitGeo = new THREE.PlaneGeometry(blockWidth, blockDepth);
    const addHitZone = new THREE.Mesh(
    hitGeo,
    new THREE.MeshBasicMaterial({ visible: false })
    );

    addHitZone.rotation.x = -Math.PI / 2;
    addHitZone.position.y = 0.1;

    addGroup.add(addHitZone);

    const borderMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.3
    });

    const borderGroup = new THREE.Group();
    const thickness = 0.3;
    const height = 0.1;

    const hGeo = new THREE.BoxGeometry(blockWidth + thickness, height, thickness);
    const vGeo = new THREE.BoxGeometry(thickness, height, blockDepth - thickness);

    const top = new THREE.Mesh(hGeo, borderMat);
    top.position.set(0, height / 2, -blockDepth / 2);

    const bottom = new THREE.Mesh(hGeo, borderMat);
    bottom.position.set(0, height / 2, blockDepth / 2);

    const left = new THREE.Mesh(vGeo, borderMat);
    left.position.set(-blockWidth / 2, height / 2, 0);

    const right = new THREE.Mesh(vGeo, borderMat);
    right.position.set(blockWidth / 2, height / 2, 0);

    borderGroup.add(top, bottom, left, right);
    addGroup.add(borderGroup);

    // ข้อความ
    const textMat = new THREE.MeshBasicMaterial({
    map: createAddTextTexture(),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
    });

    const textPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    textMat
    );

    textPlane.rotation.x = -Math.PI / 2;
    textPlane.position.y = 0.15;

    addGroup.add(textPlane);

    // hover
    addHitZone.userData = {
    isAddButton: true,
    borderMat: borderMat
    };

    scene.add(addGroup);
    stockZones.push(addHitZone);
}

// ==========================================
// 4. Raycaster, Limits & Animation Loop
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentHoveredObj = null; 

const minPan = new THREE.Vector3(-40, 0, -40); 
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

    let newlyHovered = null;
    if (intersects.length > 0) {
        newlyHovered = intersects[0].object.userData; // ดึง userData ออกมาเช็ค
    }

    // จัดการ Event Hover (รองรับทั้งโกดัง และ ปุ่ม Add)
    if (newlyHovered !== currentHoveredObj) {
        if (currentHoveredObj) {
            // Hover Out
            if (currentHoveredObj.stockInstance) {
                currentHoveredObj.stockInstance.hoverOut();
            } else if (currentHoveredObj.isAddButton) {
                gsap.killTweensOf(currentHoveredObj.borderMat);
                gsap.to(currentHoveredObj.borderMat, { duration: 0.3, opacity: 0.3 }); 
            }
            document.body.style.cursor = 'default';
        }

        if (newlyHovered) {
             // Hover In
             if (newlyHovered.stockInstance) {
                 newlyHovered.stockInstance.hoverIn();
             } else if (newlyHovered.isAddButton) {
                 gsap.killTweensOf(newlyHovered.borderMat);
                 gsap.to(newlyHovered.borderMat, { duration: 0.3, opacity: 1.0 }); // สว่างจ้าเวลาชี้
             }
             document.body.style.cursor = 'pointer';
        }
        currentHoveredObj = newlyHovered;
    }

    renderer.render(scene, camera);
}

// display popup
let mouseDownPosition = new THREE.Vector2();

window.addEventListener('mousedown', (event) => {
    mouseDownPosition.x = event.clientX;
    mouseDownPosition.y = event.clientY;
});

renderer.domElement.addEventListener('mouseup', (event) => {

    const moveDistance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPosition.x, 2) + 
        Math.pow(event.clientY - mouseDownPosition.y, 2)
    );

    if (moveDistance > 5) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stockZones);

    if (intersects.length === 0) {

        currentWarehouseId = null;

        if (window.closePopup) window.closePopup();

        trashBtn.classList.remove('opacity-100','scale-100');
        trashBtn.classList.add('opacity-0','scale-75','pointer-events-none');

        return;
    }

    const userData = intersects[0].object.userData;

    if (userData.isAddButton) {
        window.location.href = "/warehouse_management/create";
        return;
    }

    if (userData.stockInstance && window.openStockPopup) {

        const stock = userData.stockInstance;

        fetch(`/api/warehouses/${stock.id}`)
        .then(res => res.json())
        .then(data => {

            currentWarehouseId = data.wh_id;

            window.openStockPopup({
                name: data.wh_name,
                id: 'A' + String(data.wh_id).padStart(3, '0'),
                manager: data.manager_name,
                location: data.location,
                current: data.current,
                max: data.capacity
            });

            document.querySelector('#wh-popup a').href =`/warehouse_management/edit?wh_id=${data.wh_id}`;
            document.getElementById("edit-link").href =`/warehouse_management/edit?wh_id=${data.wh_id}`;

            if (data.current == 0) {
                trashBtn.classList.remove('opacity-0','scale-75','pointer-events-none');
                trashBtn.classList.add('opacity-100','scale-100');
            } else {
                trashBtn.classList.remove('opacity-100','scale-100');
                trashBtn.classList.add('opacity-0','scale-75','pointer-events-none');
            }
        });
    }
});

function updateTime() {
  const now = new Date();

  const formatted =
    now.toLocaleDateString("th-TH") + " " +
    now.toLocaleTimeString("th-TH");

  document.getElementById("currentTime").textContent = formatted;
}

trashBtn.addEventListener("click", function () {
    if (!currentWarehouseId) return;

    popup.classList.remove('opacity-0','scale-95','pointer-events-none');
    popup.classList.add('opacity-100','scale-100');
});

confirmBtn.addEventListener('click', function () {
    if (!currentWarehouseId) return;

    fetch(`/api/warehouses/${currentWarehouseId}`, {
        method: "DELETE"
    })
    .then(res => {
        if (!res.ok) throw new Error("Delete failed");
        return res.json();
    })
    .then(() => {
        alert("ลบคลังสำเร็จ");
        popup.classList.remove('opacity-100','scale-100');
        popup.classList.add('opacity-0','scale-95','pointer-events-none');
        location.reload();
    })
    .catch(err => {
        alert("เกิดข้อผิดพลาด");
        console.error(err);
    });
});

cancelBtn.addEventListener('click', function () {
    popup.classList.remove('opacity-100','scale-100');
    popup.classList.add('opacity-0','scale-95','pointer-events-none');
});

updateTime();
setInterval(updateTime, 1000);

loadWarehouses();
animate();