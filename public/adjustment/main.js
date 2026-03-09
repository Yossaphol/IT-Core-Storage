import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { StockBlock } from './StockBlock.js';

import {
    loadWarehouses,
    initWarehouseSelector,
    initSorting,
    showShelfDetails,
    closeDetailPanel
} from "./uiController.js";

async function initUI(){

    await loadWarehouses();

    initWarehouseSelector();
    initSorting();

    const firstWh = document.getElementById("warehouse").value;

    if(firstWh){
        await loadWarehouseLayout(firstWh);
    }

}

initUI();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0E1324);
scene.fog = new THREE.FogExp2(0x0E1324, 0.008);

const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 50;

const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
);

camera.position.set(15, 30, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

document.getElementById("three-container")
    .appendChild(renderer.domElement);

const controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({
        color: 0x1a1f30,
        roughness: 0.8
    })
);

floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const gridHelper = new THREE.GridHelper(400, 100, 0xffffff, 0xffffff);
gridHelper.position.y = 0.02;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.1;

scene.add(gridHelper);

const shelfHitZones = [];
let hoveredShelf = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('mousemove', (e) => {

    const rect = renderer.domElement.getBoundingClientRect();

    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(shelfHitZones);

    if (intersects.length > 0) {

        const shelf = intersects[0].object;

        if (hoveredShelf !== shelf) {

            if (hoveredShelf) {
                StockBlock.hoverEffect(hoveredShelf,false);
            }

            hoveredShelf = shelf;
            renderer.domElement.style.cursor = "pointer";

            StockBlock.hoverEffect(hoveredShelf,true);

        }

    } else {

        if (hoveredShelf) {
            StockBlock.hoverEffect(hoveredShelf,false);
            hoveredShelf = null;
            renderer.domElement.style.cursor = "default";
        }

    }

});

window.addEventListener('click', async () => {

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(shelfHitZones);

    if (intersects.length > 0) {

        const clickedShelf = intersects[0].object;

        const shelfId = clickedShelf.userData.id;

        try {

            const res = await fetch(`/api/get-shelf/${shelfId}/products`);
            const products = await res.json();

            const shelfData = {

                name: clickedShelf.name || "Shelf",
                id: shelfId,

                current: products.reduce((sum, p) => sum + p.amount, 0),

                max: clickedShelf.userData.capacity || 50,

                items: products.map(p => ({
                    prod_id: p.prod_id,
                    shelf_id: shelfId,
                    name: p.prod_name,
                    qty: p.amount,
                    sku: p.prod_sku,
                    type: p.prod_type,
                    description: p.prod_description,
                    img: p.prod_img,
                    timestamp: Date.now()
                }))

            };

            showShelfDetails(shelfData);

        } catch (err) {

            console.error("Load shelf products error:", err);

        }
    } else {
        closeDetailPanel();
    }

});

window.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {
        closeDetailPanel();
    }

});

function animate() {

    requestAnimationFrame(animate);

    controls.update();

    renderer.render(scene, camera);

}

async function loadWarehouseLayout(warehouseId){

    shelfHitZones.length = 0;

    const objectsToRemove = [];

    scene.children.forEach(obj=>{
        if(obj.userData?.type === "stockBlock"){
            objectsToRemove.push(obj);
        }
    });

    objectsToRemove.forEach(obj=>scene.remove(obj));

    const res = await fetch(`/api/warehouses/${warehouseId}/stocks`);
    const stocks = await res.json();

    const spacingX = 18;
    const spacingZ = 16;

    const cols = 3;
    const rows = Math.ceil(stocks.length / cols);

    const offsetX = (cols - 1) / 2;
    const offsetZ = (rows - 1) / 2;

    for(let i=0;i<stocks.length;i++){

        const stock = stocks[i];

        const col = i % cols;
        const row = Math.floor(i / cols);

    const posX = (col - offsetX) * spacingX;
    const posZ = (row - offsetZ) * spacingZ;

        const shelfRes = await fetch(`/api/get-shelf/${stock.stock_id}`);
        const shelves = await shelfRes.json();

        const block = new StockBlock(posX,posZ,shelves);

        block.group.userData.type = "stockBlock";

        scene.add(block.group);

        shelfHitZones.push(...block.shelfHitZones);

    }

}
window.loadWarehouseLayout = loadWarehouseLayout;

animate();