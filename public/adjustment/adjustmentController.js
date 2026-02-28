// adjustmentController.js
export function initAdjustmentController(camera, raycaster, mouse, shelfHitZones) {
    window.addEventListener('click', () => {
        // ตรวจสอบตำแหน่งเม้าส์กับวัตถุ 3D
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(shelfHitZones);

        if (intersects.length > 0) {
            const clickedShelf = intersects[0].object;
            
            // เตรียมข้อมูลที่จะส่งไปโชว์ที่หน้าจอ (ในอนาคตดึงจาก Database)
            // ใน adjustmentController.js ส่วนของ shelfData
            const shelfData = {
                name: clickedShelf.name || "A1",
                id: clickedShelf.userData.id || "ST-001",
                current: 45,
                max: 50,
                items: [
                    { 
                        name: 'RAM CORSAIR VENGEANCE RGB PRO 16GB', 
                        qty: 12, 
                        sku: 'SKU-8891', 
                        brand: 'Corsair',
                        timestamp: 1710000000000, // ใส่ timestamp เพื่อใช้เรียงตามเวลา
                        img: '/images/ram000.jpg',
                        type: 'CPU', // เพิ่มฟิลด์นี้
                        description: 'Gen 14 High Performance' // เพิ่มฟิลด์นี้ 
                    },
                    { 
                        name: 'Intel Core i9-14900K', 
                        qty: 5, 
                        sku: 'SKU-7721', 
                        brand: 'Intel',
                        timestamp: 1720000000000,
                        img: 'https://m.media-amazon.com/images/I/616vR7S-OQL._AC_SL1500_.jpg',
                        type: 'CPU', // เพิ่มฟิลด์นี้
                        description: 'Gen 14 High Performance' // เพิ่มฟิลด์นี้
                    }
                ]
            };

            // เรียกใช้ฟังก์ชันที่ประกาศไว้ในหน้า EJS
            if (window.showShelfDetails) {
                window.showShelfDetails(shelfData);
            }
        }
    });
}