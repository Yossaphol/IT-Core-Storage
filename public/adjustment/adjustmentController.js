export function initAdjustmentController(camera, raycaster, mouse, shelfHitZones) {
    window.addEventListener('click', () => {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(shelfHitZones);

        if (intersects.length > 0) {
            const clickedShelf = intersects[0].object;
            
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
                        timestamp: 1710000000000,
                        img: '/images/ram000.jpg',
                        type: 'CPU',
                        description: 'Gen 14 High Performance'
                    },
                    { 
                        name: 'Intel Core i9-14900K', 
                        qty: 5, 
                        sku: 'SKU-7721', 
                        brand: 'Intel',
                        timestamp: 1720000000000,
                        img: 'https://m.media-amazon.com/images/I/616vR7S-OQL._AC_SL1500_.jpg',
                        type: 'CPU',
                        description: 'Gen 14 High Performance'
                    }
                ]
            };

            if (window.showShelfDetails) {
                window.showShelfDetails(shelfData);
            }
        }
    });
}