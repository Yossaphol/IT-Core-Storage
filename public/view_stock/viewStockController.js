// popup
const popup = document.getElementById('stock-popup');
const detailPanel = document.getElementById('detail-panel');

window.closePopup = function() {
			popup.classList.remove('scale-100', 'opacity-100');
			popup.classList.add('scale-95', 'opacity-0');
			setTimeout(() => { popup.classList.add('hidden'); }, 300);
		};


let currentProducts = [
        {
            id: 'SKU-128897',
            name: 'RAM CORSAIR VENGEANCE RGB PRO SL 16GB (8x2) DDR4',
            brand: 'CORSAIR',
            qty: 12,
            time: 1670000000000, // Older timestamp
            img: 'https://m.media-amazon.com/images/I/61S6n67m9ML._AC_SL1500_.jpg'
        },
        {
            id: 'SKU-992341',
            name: 'KINGSTON FURY BEAST 32GB (16x2) DDR5 5200MHz',
            brand: 'Kingston',
            qty: 5,
            time: 1710000000000, // Mid timestamp
            img: 'https://m.media-amazon.com/images/I/71uVhw0P3aL._AC_SL1500_.jpg'
        },
        {
            id: 'SKU-551234',
            name: 'G.SKILL TRIDENT Z5 RGB 32GB (16x2) DDR5 6000MHz',
            brand: 'G.Skill',
            qty: 25,
            time: 1720000000000, // Newest timestamp
            img: 'https://m.media-amazon.com/images/I/61cQ-Hq14YL._AC_SL1500_.jpg'
        }
    ];
    function renderProducts(products) {
        const list = document.getElementById('product-list');
        list.innerHTML = products.map(p => `
            <div class="flex gap-4  p-4 items-center border-b border-[#4BA3E3]/20  transition-all">
                <img src="${p.img}" class="w-20 h-20 object-contain bg-white" />
                <div class="text-[12px] flex-1">
                    <p class="text-gray-400">รหัสสินค้า: ${p.id}</p>
                    <p class="text-white leading-tight">${p.name}</p>
                    <div class="flex justify-between mt-2">
                        <span class="text-gray-400 cursor-pointer">แบรนด์ ${p.brand}</span>
                        <span class="text-white">จำนวน: ${p.qty}</span>
                    </div>
                </div>
            </div>`).join('');
    }
    // 3. Sorting Event Listener
    document.getElementById('product-sort').addEventListener('change', function(e) {
        const sortBy = e.target.value;
        let sortedArray = [...currentProducts]; // Create a copy so we don't mutate the original array
        switch (sortBy) {
            case 'name-asc':
                sortedArray.sort((a, b) => a.name.localeCompare(b.name, 'th'));
                break;
            case 'name-desc':
                sortedArray.sort((a, b) => b.name.localeCompare(a.name, 'th'));
                break;
            case 'qty-desc':
                sortedArray.sort((a, b) => b.qty - a.qty);
                break;
            case 'qty-asc':
                sortedArray.sort((a, b) => a.qty - b.qty);
                break;
            case 'time-asc':
                sortedArray.sort((a, b) => a.time - b.time);
                break;
            case 'time-desc':
                sortedArray.sort((a, b) => b.time - a.time);
                break;
        }
        renderProducts(sortedArray);
    });
    // Logic to update the Detail Panel data
    window.updateDetailPanelData = function(data) {
        document.getElementById('detail-name').innerText = data.name;
        document.getElementById('detail-id').innerText = data.id;
        document.getElementById('detail-type').innerText = data.type;
        document.getElementById('detail-location').innerText = data.location;
        document.getElementById('detail-current').innerText = data.current;
        document.getElementById('detail-max').innerText = data.max;
        
        const percent = (data.current / data.max) * 100;
        document.getElementById('detail-progress').style.width = percent + '%';
        // Reset sort dropdown to default
        document.getElementById('product-sort').value = 'name-asc';
        
        // Initial render: Sort A-Z by default when panel opens
        let initialSort = [...currentProducts].sort((a, b) => a.name.localeCompare(b.name, 'th'));
        renderProducts(initialSort);
    };
    window.openStockPopup = function(data) {
		document.getElementById('popup-stock-name').innerText = data.name;
		document.getElementById('popup-stock-id').innerText = data.id;
		document.getElementById('popup-stock-location').innerText = data.location;
		document.getElementById('popup-stock-type').innerText = data.type;
		document.getElementById('popup-stock-current').innerText = data.current;
        document.getElementById('popup-stock-max').innerText = data.max;
		
        const percent = (data.current / data.max) * 100;
		document.getElementById('popup-stock-progress').style.width = percent + '%';
		popup.classList.remove('hidden');
        setTimeout(() => {
			popup.classList.remove('scale-95', 'opacity-0');
			popup.classList.add('scale-100', 'opacity-100');
		}, 10);
        // AUTO-UPDATE: If the detail panel is already open, refresh its data immediately
        if (!detailPanel.classList.contains('translate-x-full')) {
            window.updateDetailPanelData(data);
        }
	};
    window.showFullDetails = function() {
        // Get current data from the small popup
        const currentData = {
            name: document.getElementById('popup-stock-name').innerText,
            id: document.getElementById('popup-stock-id').innerText,
            location: document.getElementById('popup-stock-location').innerText,
            type: document.getElementById('popup-stock-type').innerText,
            current: document.getElementById('popup-stock-current').innerText,
            max: document.getElementById('popup-stock-max').innerText
        };
        
        window.updateDetailPanelData(currentData);
        detailPanel.classList.remove('translate-x-full');
    };
    window.closeDetailPanel = function() {
        detailPanel.classList.add('translate-x-full');
    };


// select warehouse button
document.addEventListener('DOMContentLoaded', () => {
    const warehouseSelect = document.getElementById("warehouseSelect");

    async function loadWarehouses() {
        try {
            const response = await fetch('/api/warehouses'); 
            if (!response.ok) { 
                throw new Error('Response was not ok'); 
            } 
            const warehouses = await response.json(); 
            warehouseSelect.innerHTML = ''; 

            const urlParams = new URLSearchParams(window.location.search);
            const wParam = urlParams.get('w');
            let selectedId = null;

            if (wParam) {
                try {
                    selectedId = atob(wParam);
                } catch (e) {
                    console.error("Failed to decode URL parameter:", e);
                }
            }

            warehouses.forEach(warehouse => { 
                const option = document.createElement('option'); 
                option.value = warehouse.wh_id; 
                option.textContent = warehouse.wh_name; 
                option.className = "text-black"; 
                
                if (String(warehouse.wh_id) === selectedId) {
                    option.selected = true;
                }

                warehouseSelect.appendChild(option); 
            }); 

        } catch (error) { 
            console.error('Error fetching warehouse data:', error); 
            warehouseSelect.innerHTML = '<option value="" class="text-black" disabled>ไม่สามารถโหลดข้อมูลได้</option>'; 
        }
    }
    
    loadWarehouses(); 

    warehouseSelect.addEventListener("change", function () { 
        if (!this.value) return; 

        const obfuscatedValue = btoa(this.value); 
        const encoded = encodeURIComponent(obfuscatedValue); 
        window.location.href = `/?w=${encoded}`; 
    }); 
}); 
