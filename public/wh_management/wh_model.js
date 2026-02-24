// StockBlock.js
import * as THREE from 'three';
import gsap from 'gsap';

// เตรียมชุดสีสว่างๆ สำหรับสุ่มเป็นสีหลังคา สีตู้คอนเทนเนอร์ และสีกล่อง
const brightRoofColors = [
    0xff4757, // แดงแตงโม
    0x2ed573, // เขียวสว่าง
    0x1e90ff, // น้ำเงินสว่าง (Dodger Blue)
    0xffa502, // ส้มสว่าง
    0xff6b81, // ชมพูพาสเทล
    0xe84118, // ส้มแดง
    0xfbc531, // เหลือง
    0x00e5ff, // ฟ้าไซแอน
    0x9c88ff  // ม่วงสว่าง
];

export class Warehouse_model {
    constructor(x, z, id) {
        this.id = id;
        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);
        this.hitZone = null;
        this.borderMat = null;
        this.init();
    }

    init() {
        this.createHitZoneAndBorder();
        this.createWarehouse(); 
        
        // หมุนกลุ่มโมเดลโกดังให้เฉียงซ้ายเล็กน้อย
        this.group.rotation.y = Math.PI / 18; 
    }

    createHitZoneAndBorder() {
        // ขยายพื้นที่โซน Hover ให้ลึกขึ้นเพื่อครอบคลุมรถบรรทุกที่ขยับออกมา
        const blockWidth = 11.0; 
        const blockDepth = 14.0; 
        
        const hitGeo = new THREE.PlaneGeometry(blockWidth, blockDepth);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false }); 
        this.hitZone = new THREE.Mesh(hitGeo, hitMat);
        this.hitZone.rotation.x = -Math.PI / 2; 
        this.hitZone.position.y = 0.1;
        this.hitZone.userData.stockInstance = this; 
        
        // กรอบ Hover สีนีออนฟ้า
        this.borderMat = new THREE.MeshBasicMaterial({ 
            color: 0x00e5ff, 
            transparent: true, 
            opacity: 0.0       
        });
        
        const borderGroup = new THREE.Group();
        const thickness = 0.3; 
        const height = 0.1;    
        const hGeo = new THREE.BoxGeometry(blockWidth + thickness, height, thickness);
        const vGeo = new THREE.BoxGeometry(thickness, height, blockDepth - thickness);

        const top = new THREE.Mesh(hGeo, this.borderMat); top.position.set(0, height/2, -blockDepth/2);
        const bottom = new THREE.Mesh(hGeo, this.borderMat); bottom.position.set(0, height/2, blockDepth/2);
        const left = new THREE.Mesh(vGeo, this.borderMat); left.position.set(-blockWidth/2, height/2, 0);
        const right = new THREE.Mesh(vGeo, this.borderMat); right.position.set(blockWidth/2, height/2, 0);

        borderGroup.add(top, bottom, left, right);
        
        this.group.add(this.hitZone);
        this.group.add(borderGroup);
    }

    createTruck(color) {
        const truckGroup = new THREE.Group();

        // 1. ตู้คอนเทนเนอร์ (Container) ใช้สีเดียวกับหลังคา
        const containerGeo = new THREE.BoxGeometry(1.6, 1.8, 3.5);
        const containerMat = new THREE.MeshStandardMaterial({ 
            color: color, 
            roughness: 0.6,
            metalness: 0.2
        });
        const container = new THREE.Mesh(containerGeo, containerMat);
        container.position.set(0, 1.5, -0.8); 
        container.castShadow = true;
        container.receiveShadow = true;
        truckGroup.add(container);

        // 2. หัวรถบรรทุก (Cabin) สีขาว
        const cabinGeo = new THREE.BoxGeometry(1.6, 1.4, 1.2);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.3, 1.6); 
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        truckGroup.add(cabin);

        // กระจกหน้ารถ (Windshield) 
        const glassGeo = new THREE.BoxGeometry(1.4, 0.6, 1.25);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 1.5, 1.6);
        truckGroup.add(glass);

        // 3. แชสซี/ฐานรถ (Chassis)
        const chassisGeo = new THREE.BoxGeometry(1.4, 0.2, 4.4);
        const chassisMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.set(0, 0.6, 0.2);
        chassis.castShadow = true;
        truckGroup.add(chassis);

        // 4. ล้อรถ (Wheels)
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16);
        
        const wheelPositions = [
            [-0.8, 0.35, 1.5],  // หน้าซ้าย
            [ 0.8, 0.35, 1.5],  // หน้าขวา
            [-0.8, 0.35, -0.5], // หลังซ้าย 1
            [ 0.8, 0.35, -0.5], // หลังขวา 1
            [-0.8, 0.35, -1.5], // หลังซ้าย 2
            [ 0.8, 0.35, -1.5], // หลังขวา 2
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            wheel.castShadow = true;
            wheel.receiveShadow = true;
            truckGroup.add(wheel);
        });

        return truckGroup;
    }

    createWarehouse() {
        const warehouseGroup = new THREE.Group();

        // 1. ตัวอาคาร (Main Building) - สีขาว
        const bWidth = 7.0;
        const bHeight = 4.2;
        const bDepth = 7.0;

        const wallMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // สีขาว
            roughness: 0.9,
            metalness: 0.1
        });
        const buildingGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
        const building = new THREE.Mesh(buildingGeo, wallMat);
        building.position.y = bHeight / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        warehouseGroup.add(building);

        // สุ่มสี (สีนี้จะถูกแชร์ให้ทั้งหลังคาและรถบรรทุก)
        const randomSharedColor = brightRoofColors[Math.floor(Math.random() * brightRoofColors.length)];

        // 2. หลังคา (Roof)
        const roofMat = new THREE.MeshStandardMaterial({ 
            color: randomSharedColor, 
            roughness: 0.8
        });
        const roofGeo = new THREE.ConeGeometry(5.3, 2.5, 4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.y = Math.PI / 4; 
        roof.position.y = bHeight + 1.25; 
        roof.castShadow = true;
        roof.receiveShadow = true;
        warehouseGroup.add(roof);

        // 3. ประตูม้วน (Roller Door) ด้านหน้า 
        const doorMat = new THREE.MeshStandardMaterial({ 
            color: 0x4b586e, 
            roughness: 0.7 
        });
        const doorGeo = new THREE.BoxGeometry(2.5, 3.2, 0.1);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 3.2 / 2, bDepth / 2 + 0.05);
        door.receiveShadow = true;
        warehouseGroup.add(door);

        // 4. แถบสีตกแต่ง (Accent) ตามขอบด้านบน
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff });
        const accentGeo = new THREE.BoxGeometry(bWidth + 0.05, 0.2, bDepth + 0.05);
        const accent = new THREE.Mesh(accentGeo, accentMat);
        accent.position.y = bHeight - 0.4;
        warehouseGroup.add(accent);

        // 5. กล่องสินค้าหน้าโกดัง (Boxes) วางแบบสุ่ม 2-3 ใบ
        const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const numBoxes = Math.floor(Math.random() * 2) + 2; // สุ่ม 2 หรือ 3 ใบ
        for (let b = 0; b < numBoxes; b++) {
            const randomBoxColor = brightRoofColors[Math.floor(Math.random() * brightRoofColors.length)];
            const boxMat = new THREE.MeshStandardMaterial({ color: randomBoxColor, roughness: 0.8 });
            const box = new THREE.Mesh(boxGeo, boxMat);
            
            // สุ่มตำแหน่งหน้าประตูโกดัง (ซ้าย-ขวา และ ระยะห่างจากประตู)
            const boxX = (Math.random() - 0.5) * 2.5 - 1.0; // กองไว้เยื้องซ้ายนิดๆ จะได้ไม่ชนรถ
            const boxZ = (bDepth / 2) + 0.6 + (Math.random() * 1.2); 
            
            box.position.set(boxX, 0.35, boxZ);
            box.rotation.y = Math.random() * Math.PI; // สุ่มหมุนกล่องให้ดูเป็นธรรมชาติ
            box.castShadow = true;
            box.receiveShadow = true;
            warehouseGroup.add(box);
        }

        // 6. รถบรรทุก (Truck) - ดันออกมาด้านหน้า (Z=6.0) และเยื้องขวา (X=2.5) ไม่ให้ชนโกดัง
        const truck = this.createTruck(randomSharedColor);
        truck.position.set(2.5, 0, 6.0); 
        truck.rotation.y = -Math.PI / 6; // หันหน้ารถออกเฉียงๆ
        warehouseGroup.add(truck);

        this.group.add(warehouseGroup);
    }

    hoverIn() {
        gsap.killTweensOf(this.borderMat);
        gsap.to(this.borderMat, { duration: 0.3, opacity: 0.6 }); 
    }

    hoverOut() {
        gsap.killTweensOf(this.borderMat);
        gsap.to(this.borderMat, { duration: 0.3, opacity: 0.0 });
    }
}