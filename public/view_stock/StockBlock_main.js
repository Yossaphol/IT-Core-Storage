import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { StockBlock } from './StockBlock.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0E1324); 
scene.fog = new THREE.FogExp2(0x0E1324, 0.008);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(15, 50, 15); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; 
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("three-container").appendChild(renderer.domElement);

const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableRotate = false; 
controls.enablePan = true; 
controls.enableZoom = true;    
controls.minDistance = 20; 
controls.maxDistance = 250;     

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

const stockZones = []; 
const spacingX = 18; 
const spacingZ = 16; 

const loadStockAndBuild = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const wParam = urlParams.get('w');
    let wh_id = null;

    if (wParam) {
        try {
            wh_id = atob(wParam);
        } catch (err) {
            console.error('Failed to decode url', err); 
        }
    }
    
    try {
        if (!wh_id) {
            const whRes = await fetch('/api/warehouses');
            const whData = await whRes.json();
            
            if (whData.length > 0) {
                wh_id = whData[0].wh_id;
            } else {
                console.warn("No warehouses exist in the database.");
                return; 
            }
        }

        const res = await fetch(`/api/warehouses/${wh_id}/stocks`);
        if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
        }
        const data = await res.json();

        const stockCountFromDB = data.length;
        const columnsPerRow = Math.ceil(Math.sqrt(stockCountFromDB)); 
        const totalRows = Math.ceil(stockCountFromDB / columnsPerRow);

       const stockPromises = data.map(async (stock_data, i) => {
            const col = i % columnsPerRow;
            const row = Math.floor(i / columnsPerRow);

            const posX = (col - (columnsPerRow - 1) / 2) * spacingX;
            const posZ = (row - (totalRows - 1) / 2) * spacingZ;
            const max_capa = stock_data.capacity; 
            
            let shelvesData = [];
            try {
                const shelfRes = await fetch(`/api/get-shelf/${stock_data.stock_id}`);
                if (shelfRes.ok) {
                    shelvesData = await shelfRes.json();
                }
            } catch (err) {
                console.error("Failed to load shelves for stock", stock_data.stock_id, err);
            }

            const stockBlock = new StockBlock(posX, posZ, stock_data, wh_id, max_capa, shelvesData);
            scene.add(stockBlock.group);
            
            return stockBlock.shelfHitZones;
        });

        const allHitZones = await Promise.all(stockPromises);
        allHitZones.forEach(zones => stockZones.push(...zones));

    } catch (err) {
        console.error("Failed to load warehouse stocks:", err);
    }
};

loadStockAndBuild();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentHoveredStock = null; 

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

    if (moveDistance > 5) return; 
    if (event.target.tagName !== 'CANVAS') return; 

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(stockZones);

    if (intersects.length > 0) {
        const clickedShelfData = intersects[0].object.userData.shelfData;
        
        if(window.openStockPopup && clickedShelfData) {
            window.openStockPopup(clickedShelfData);
        }
    } else {
        if(window.closePopup) window.closePopup();
        if(window.closeDetailPanel) window.closeDetailPanel();
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
        newlyHoveredStock = intersects[0].object; 
    }

    if (newlyHoveredStock !== currentHoveredStock) {
        if (currentHoveredStock) {
            StockBlock.hoverEffect(currentHoveredStock, false);
            document.body.style.cursor = 'default';
        }
        if (newlyHoveredStock) {
             StockBlock.hoverEffect(newlyHoveredStock, true);
             document.body.style.cursor = 'pointer';
        }
        currentHoveredStock = newlyHoveredStock;
    }

    renderer.render(scene, camera);
}

animate();