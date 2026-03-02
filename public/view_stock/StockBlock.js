import * as THREE from 'three';
import gsap from 'gsap';

// วัสดุเหล็กสำหรับโครงสร้างชั้นวาง
const metalRackMat = new THREE.MeshStandardMaterial({ 
    color: 0x5a6370, 
    roughness: 0.5,  
    metalness: 0.8   
});

// วัสดุสำหรับแผ่นชั้นวาง
const shelfPlateMat = new THREE.MeshStandardMaterial({ 
    color: 0xbdc3c7, 
    roughness: 0.8 
});

const boxColors = [0xff4757, 0x2ed573, 0x1e90ff, 0xffa502, 0x3742fa, 0xe84118, 0xfbc531];
const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7); 

const shelfWidth = 3.2, shelfDepth = 1.4, shelfHeight = 3.5; 
const legThickness = 0.12;

export class StockBlock {
   constructor(x, z, stockData, wh_id, max_capa, shelvesData = []) {
        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);
        this.shelfHitZones = []; 
        
        this.stockData = stockData || {};
        this.wh_id = wh_id;
        this.max_capa = max_capa;
        
        // เก็บ Array ข้อมูลชั้นวางที่ดึงจาก API
        this.shelvesData = shelvesData; 

        this.init();
    }

    init() {
        this.createShelvesAndBoxes();
    }

	createWarehouseRack(posX, posZ, shelfIndex, totalShelves, currentShelfData) {
        const rackGroup = new THREE.Group();
        rackGroup.position.set(posX, 0, posZ);

        // --- 1. เสาหลัก 4 ต้น ---
        const postGeo = new THREE.BoxGeometry(legThickness, shelfHeight, legThickness);
        const postPositions = [
            [-shelfWidth/2, shelfHeight/2, shelfDepth/2],
            [shelfWidth/2, shelfHeight/2, shelfDepth/2],
            [-shelfWidth/2, shelfHeight/2, -shelfDepth/2],
            [shelfWidth/2, shelfHeight/2, -shelfDepth/2]
        ];
        postPositions.forEach(p => {
            const post = new THREE.Mesh(postGeo, metalRackMat);
            post.position.set(p[0], p[1], p[2]);
            post.castShadow = true;
            rackGroup.add(post);
        });

        // --- 2. คานและแผ่นชั้นวาง ---
        const levels = [0.8, 2.0, 3.2]; 
        const beamGeo = new THREE.BoxGeometry(shelfWidth, 0.1, 0.1);
        const plateGeo = new THREE.BoxGeometry(shelfWidth - 0.1, 0.05, shelfDepth - 0.1);

        levels.forEach(y => {
            const frontBeam = new THREE.Mesh(beamGeo, metalRackMat);
            frontBeam.position.set(0, y, shelfDepth/2);
            rackGroup.add(frontBeam);

            const backBeam = new THREE.Mesh(beamGeo, metalRackMat);
            backBeam.position.set(0, y, -shelfDepth/2);
            rackGroup.add(backBeam);

            const plate = new THREE.Mesh(plateGeo, shelfPlateMat);
            plate.position.set(0, y, 0);
            plate.receiveShadow = true;
            rackGroup.add(plate);
        });

        // --- 3. โครงเหล็กกากบาท ---
        const braceGeo = new THREE.BoxGeometry(0.05, shelfHeight * 1.05, 0.05);
        [[-shelfWidth/2, 0], [shelfWidth/2, 0]].forEach(side => {
            const brace1 = new THREE.Mesh(braceGeo, metalRackMat);
            brace1.position.set(side[0], shelfHeight/2, 0);
            brace1.rotation.x = Math.PI / 4; 
            rackGroup.add(brace1);

            const brace2 = brace1.clone();
            brace2.rotation.x = -Math.PI / 4; 
            rackGroup.add(brace2);
        });

        // --- 4. Hit Zone & Hover Border ---
        const hitGeo = new THREE.BoxGeometry(shelfWidth + 0.2, shelfHeight, shelfDepth + 0.2);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitZone = new THREE.Mesh(hitGeo, hitMat);
        hitZone.position.y = shelfHeight / 2;
        
        const borderGeo = new THREE.BoxGeometry(shelfWidth + 0.3, shelfHeight + 0.1, shelfDepth + 0.3);
        const borderMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0 });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.y = shelfHeight / 2;

        // ฝังข้อมูลลงใน userData เพื่อให้ส่งไปแสดงบน Popup ได้
        const st_name = 'ST'+this.stockData.stock_id || 'A';
        const st_id = this.stockData.stock_id || '00';
        const dbShelfName = `${st_name}-${shelfIndex}`;
        const dbShelfId = currentShelfData?.shelf_id || `ST${st_id}-SH${shelfIndex}`;
        const dbShelfCurrent = currentShelfData?.amount || 0;
        const dbShelfMax = currentShelfData?.capacity || Math.floor((this.max_capa || 100) / totalShelves);

        hitZone.userData = {
            borderMat: borderMat,
            shelfData: {
                name: dbShelfName,
                id: dbShelfId,
                location: `WH${this.wh_id}-ST${st_id}-${shelfIndex}`,
                type: currentShelfData.product_type || "อุปกรร์คอมพิวเตอร์",
				size: currentShelfData.size,
                current: dbShelfCurrent, 
                max: dbShelfMax
            }
        };

        rackGroup.add(hitZone);
        rackGroup.add(border);
        this.shelfHitZones.push(hitZone);

        return rackGroup;
    }

   createShelvesAndBoxes() {
        const levels = [0.8, 2.0, 3.2]; 
        let shelfIndex = 1;

        // 1. ดึงจำนวนชั้นวาง (n) จาก Database สมมติว่าชื่อฟิลด์คือ shelf_count 
        // (ถ้าไม่มีข้อมูลส่งมา ให้ใช้ค่าเริ่มต้นคือ 6)
        const n = this.shelvesData.length; 

		if (n === 0) return ;
        
        // 2. บังคับให้มี 2 แถวเสมอ และคำนวณจำนวนคอลัมน์จาก n (ปัดเศษขึ้น)
        const rows = 2;
        const cols = Math.ceil(n / rows);

        // วนลูปสร้างทีละคอลัมน์ (ตามแนวแกน Z)
        for(let col = 0; col < cols; col++) { 
            // วนลูปสร้าง 2 แถว (ตามแนวแกน X)
            for(let row = 0; row < rows; row++) { 
                
                // ถ้านับจำนวนชั้นวางครบ n ชิ้นแล้ว ให้หยุดการสร้างทันที (กรณี n เป็นเลขคี่)
                if (shelfIndex > n) break;

                // --- สมการจัดตำแหน่งให้อยู่กึ่งกลางเสมอ ---
                // X: บังคับ 2 แถว จะได้ค่า -2.5 และ +2.5
                const posX = (row * 5.0) - 2.5; 
                // Z: จัดกึ่งกลางอัตโนมัติตามจำนวนคอลัมน์ (ระยะห่างตู้ละ 3.5)
                const posZ = (col - (cols - 1) / 2) * 3.5; 
                

                const currentShelfData = this.shelvesData[shelfIndex - 1];

                // ส่ง currentShelfData ไปให้ฟังก์ชันสร้างชั้นวาง
                this.group.add(this.createWarehouseRack(posX, posZ, shelfIndex, n, currentShelfData));
                // --- วางกล่องสุ่ม ---
                levels.forEach(shelfY => {
                    const numBoxes = Math.floor(Math.random() * 4); 
                    for(let i = 0; i < numBoxes; i++) {
                        const box = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ 
                            color: boxColors[Math.floor(Math.random() * boxColors.length)],
                            roughness: 0.8
                        }));
                        box.position.set(posX + (Math.random()-0.5)*2.2, shelfY + 0.35, posZ + (Math.random()-0.5)*0.8);
                        box.rotation.y = (Math.random()-0.5) * 0.5; 
                        box.castShadow = true;
                        this.group.add(box);
                    }
                });
                
                shelfIndex++;
            } 
        }
    }
	
    static hoverEffect(hitZone, isIn) {
        if (hitZone && hitZone.userData.borderMat) {
            gsap.to(hitZone.userData.borderMat, {
                duration: 0.2,
                opacity: isIn ? 1.0 : 0.0
            });
        }
    }
}