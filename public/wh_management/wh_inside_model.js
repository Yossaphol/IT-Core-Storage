// StockBlock.js
import * as THREE from 'three';
import gsap from 'gsap';

// --- Shared Assets (ปรับชั้นวางให้สว่างขึ้น) ---
const metalShelfMat = new THREE.MeshStandardMaterial({ 
    color: 0xdde5ed, // เปลี่ยนเป็นสีเงินสว่าง (Light Silver / Platinum)
    roughness: 0.4,  // ลดความสากลงนิดหน่อย ให้แสงเงาตกกระทบได้คมชัดขึ้น
    metalness: 0.5   // ลดจาก 0.7 เป็น 0.5 เพื่อให้สีพื้นฐาน (สีขาว/เงิน) เด้งออกมามากขึ้น ไม่จมไปกับเงามืด
});

// สีกล่องสดใสเหมือนเดิม ตัดกับชั้นวางสว่างและพื้นหลังมืด
const boxColors = [0xff4757, 0x2ed573, 0x1e90ff, 0xffa502, 0x3742fa, 0xe84118, 0xfbc531];
const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7); 

const shelfWidth = 3.2, shelfDepth = 1.6, shelfHeight = 2.2;
const legThickness = 0.1, shelfThickness = 0.05;

const legGeo = new THREE.BoxGeometry(legThickness, shelfHeight, legThickness);
const shelfPlateGeo = new THREE.BoxGeometry(shelfWidth, shelfThickness, shelfDepth);

export class StockBlock {
    constructor(x, z, id, name, currentAmount) {
        this.id = id;
        this.name = name;
        this.currentAmount = currentAmount;

        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);
        this.hitZone = null;
        this.borderMat = null;
        this.init();
    }

    init() {
        this.createHitZoneAndBorder();
        this.createShelvesAndBoxes();
    }

    createHitZoneAndBorder() {
        const blockWidth = 9.0; 
        const blockDepth = 9.0; 
        
        const hitGeo = new THREE.PlaneGeometry(blockWidth, blockDepth);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false }); 
        this.hitZone = new THREE.Mesh(hitGeo, hitMat);
        this.hitZone.rotation.x = -Math.PI / 2; 
        this.hitZone.position.y = 0.1;
        this.hitZone.userData = {
            stockInstance: this,
            id: this.id,
            name: this.name
        };
        
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

    createRealisticShelfUnit() {
        const shelfGroup = new THREE.Group();
        const legPositions = [
            [-shelfWidth/2 + legThickness/2, shelfDepth/2 - legThickness/2], 
            [shelfWidth/2 - legThickness/2, shelfDepth/2 - legThickness/2],  
            [-shelfWidth/2 + legThickness/2, -shelfDepth/2 + legThickness/2], 
            [shelfWidth/2 - legThickness/2, -shelfDepth/2 + legThickness/2]  
        ];

        legPositions.forEach(pos => { 
            const leg = new THREE.Mesh(legGeo, metalShelfMat); 
            leg.position.set(pos[0], shelfHeight / 2, pos[1]); 
            leg.castShadow = true; leg.receiveShadow = true; 
            shelfGroup.add(leg); 
        });

        const level1 = new THREE.Mesh(shelfPlateGeo, metalShelfMat); 
        level1.position.y = 0.2; level1.castShadow = true; level1.receiveShadow = true; 
        shelfGroup.add(level1);

        const level2 = new THREE.Mesh(shelfPlateGeo, metalShelfMat); 
        level2.position.y = shelfHeight / 2 + 0.1; level2.castShadow = true; level2.receiveShadow = true; 
        shelfGroup.add(level2);

        return shelfGroup;
    }

    createShelvesAndBoxes() {
        const xSlots = [-1.0, 0.0, 1.0]; 
        
        for(let row = 0; row < 2; row++) { 
            for(let col = 0; col < 3; col++) { 
                const shelfUnit = this.createRealisticShelfUnit(); 
                const posX = (row * 4.5) - 2.25; 
                const posZ = (col * 3.0) - 3.0; 
                shelfUnit.position.set(posX, 0, posZ); 
                this.group.add(shelfUnit); 
                
                for(let level = 1; level <= 2; level++) { 
                    if(Math.random() > 0.4) { 
                        const numBoxes = Math.floor(Math.random() * 3) + 1; 
                        let availableSlots = [...xSlots]; 

                        for(let b = 0; b < numBoxes; b++) { 
                            const slotIndex = Math.floor(Math.random() * availableSlots.length); 
                            const chosenXOffset = availableSlots[slotIndex]; 
                            availableSlots.splice(slotIndex, 1); 

                            const randomColor = boxColors[Math.floor(Math.random() * boxColors.length)]; 
                            const boxMat = new THREE.MeshStandardMaterial({ color: randomColor, roughness: 0.9 }); 
                            const box = new THREE.Mesh(boxGeo, boxMat); 
                            box.castShadow = true; box.receiveShadow = true; 
                            
                            let posYBase = level === 1 ? 0.2 : (2.2 / 2 + 0.1); 
                            const boxOffsetZ = (Math.random() - 0.5) * 0.4; 
                            box.position.set(posX + chosenXOffset, posYBase + 0.35, posZ + boxOffsetZ); 
                            box.rotation.y = (Math.random() - 0.5) * 0.3; 
                            
                            this.group.add(box); 
                        } 
                    } 
                } 
            } 
        }
    }

    hoverIn() {
        gsap.killTweensOf(this.borderMat);
        gsap.to(this.borderMat, { duration: 0.3, opacity: 0.5 }); 
    }

    hoverOut() {
        gsap.killTweensOf(this.borderMat);
        gsap.to(this.borderMat, { duration: 0.3, opacity: 0.0 });
    }
}