// StockBlock.js
import * as THREE from 'three';
import gsap from 'gsap';

// วัสดุเหล็กสำหรับโครงสร้างชั้นวาง (ปรับสีเทาเข้มขึ้นเพื่อให้ดูเป็นอุตสาหกรรม)
const metalRackMat = new THREE.MeshStandardMaterial({ 
    color: 0x5a6370, 
    roughness: 0.5,  
    metalness: 0.8   
});

// วัสดุสำหรับแผ่นชั้นวาง (สีเทาอ่อน)
const shelfPlateMat = new THREE.MeshStandardMaterial({ 
    color: 0xbdc3c7, 
    roughness: 0.8 
});

const boxColors = [0xff4757, 0x2ed573, 0x1e90ff, 0xffa502, 0x3742fa, 0xe84118, 0xfbc531];
const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7); 

// ปรับขนาดความสูงรวมให้สูงขึ้นเพื่อรองรับ 3 ชั้น
const shelfWidth = 3.2, shelfDepth = 1.4, shelfHeight = 3.5; 
const legThickness = 0.12;

export class StockBlock {
    constructor(x, z) {
        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);
        this.shelfHitZones = []; 
        this.init();
    }

    init() {
        this.createShelvesAndBoxes();
    }

    createWarehouseRack(posX, posZ) {
        const rackGroup = new THREE.Group();
        rackGroup.position.set(posX, 0, posZ);

        // --- 1. เสาหลัก 4 ต้น (Vertical Posts) ---
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

        // --- 2. คานและแผ่นชั้นวาง (Beams & Plates) ---
        // กำหนดความสูงของแต่ละชั้น (3 ชั้น)
        const levels = [0.8, 2.0, 3.2]; 
        const beamGeo = new THREE.BoxGeometry(shelfWidth, 0.1, 0.1);
        const plateGeo = new THREE.BoxGeometry(shelfWidth - 0.1, 0.05, shelfDepth - 0.1);

        levels.forEach(y => {
            // คานหน้า-หลัง
            const frontBeam = new THREE.Mesh(beamGeo, metalRackMat);
            frontBeam.position.set(0, y, shelfDepth/2);
            rackGroup.add(frontBeam);

            const backBeam = new THREE.Mesh(beamGeo, metalRackMat);
            backBeam.position.set(0, y, -shelfDepth/2);
            rackGroup.add(backBeam);

            // แผ่นวางของ
            const plate = new THREE.Mesh(plateGeo, shelfPlateMat);
            plate.position.set(0, y, 0);
            plate.receiveShadow = true;
            rackGroup.add(plate);
        });

        // --- 3. โครงเหล็กกากบาทด้านข้าง (Side Bracing) เพิ่มความสมจริง ---
        const braceGeo = new THREE.BoxGeometry(0.05, shelfHeight * 1.05, 0.05);
        [[-shelfWidth/2, 0], [shelfWidth/2, 0]].forEach(side => {
            const brace1 = new THREE.Mesh(braceGeo, metalRackMat);
            brace1.position.set(side[0], shelfHeight/2, 0);
            brace1.rotation.x = Math.PI / 4; // เอียง 45 องศา
            rackGroup.add(brace1);

            const brace2 = brace1.clone();
            brace2.rotation.x = -Math.PI / 4; // ตัดกันเป็นกากบาท
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

        hitZone.userData.borderMat = borderMat;
        rackGroup.add(hitZone);
        rackGroup.add(border);
        this.shelfHitZones.push(hitZone);

        return rackGroup;
    }

    createShelvesAndBoxes() {
        const levels = [0.8, 2.0, 3.2]; // ความสูงของทั้ง 3 ชั้น

        for(let row = 0; row < 2; row++) { 
            for(let col = 0; col < 3; col++) { 
                const posX = (row * 5.0) - 2.5; // ขยายระยะห่างระหว่างแถวให้สวยงามขึ้น
                const posZ = (col * 3.5) - 3.5; 
                this.group.add(this.createWarehouseRack(posX, posZ)); 

                // --- 5. วางกล่องสุ่มกระจายไปในแต่ละชั้น ---
                levels.forEach(shelfY => {
                    const numBoxes = Math.floor(Math.random() * 4); // สุ่ม 0-3 กล่องต่อ 1 ชั้น
                    for(let i = 0; i < numBoxes; i++) {
                        const box = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ 
                            color: boxColors[Math.floor(Math.random() * boxColors.length)],
                            roughness: 0.8
                        }));
                        // วางในแนวแกน Y = ระดับชั้น + ครึ่งนึงของกล่อง (0.35)
                        box.position.set(posX + (Math.random()-0.5)*2.2, shelfY + 0.35, posZ + (Math.random()-0.5)*0.8);
                        box.rotation.y = (Math.random()-0.5) * 0.5; // เอียงกล่องนิดหน่อยให้ดูสมจริง
                        box.castShadow = true;
                        this.group.add(box);
                    }
                });
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