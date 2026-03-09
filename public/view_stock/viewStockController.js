// popup
const popup = document.getElementById('stock-popup');
const detailPanel = document.getElementById('detail-panel');

window.closePopup = function() {
    popup.classList.remove('scale-100', 'opacity-100');
    popup.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { popup.classList.add('hidden'); }, 300);
};

let currentProducts = [];

function renderProducts(products) {
    const list = document.getElementById('product-list');
    
    if (products.length === 0) {
        list.innerHTML = '<p class="text-gray-400 p-4 text-center">ไม่มีสินค้าในชั้นวางนี้</p>';
        return;
    }

    list.innerHTML = products.map(p => `
        <div class="flex gap-4 p-4 items-center border-b border-[#4BA3E3]/20 transition-all">
            <img src="${p.img}" onerror="this.src='https://via.placeholder.com/150'" class="w-20 h-20 object-contain bg-white rounded" />
            <div class="text-[12px] flex-1">
                <p class="text-gray-400">รหัสสินค้า: ${p.id}</p>
                <p class="text-white leading-tight text-[16px]">${p.name}</p>
                <div class="flex justify-between mt-2">
                    <span class="text-gray-400 cursor-pointer">แบรนด์ ${p.brand || '-'}</span>
                    <span class="text-white">จำนวน: ${p.qty}</span>
                </div>
            </div>
        </div>`).join('');
}

document.getElementById('product-sort').addEventListener('change', function(e) {
    const sortBy = e.target.value;
    let sortedArray = [...currentProducts]; 
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
            sortedArray.sort((a, b) => (a.time || 0) - (b.time || 0));
            break;
        case 'time-desc':
            sortedArray.sort((a, b) => (b.time || 0) - (a.time || 0));
            break;
    }
    renderProducts(sortedArray);
});

async function fetchProductsFromAPI(shelf_id) {
    try {
        const res = await fetch(`/api/get-shelf/${shelf_id}/products`);
        if (!res.ok) throw new Error("Failed to fetch");
        const dbProducts = await res.json();

        currentProducts = dbProducts.map(item => ({
            id: item.prod_code,
            name: item.prod_name,
            brand: item.brand,
            qty: item.amount,
            img: item.prod_img || 'https://via.placeholder.com/150',
            time: new Date(item.created_at || Date.now()).getTime()
        }));

    } catch (err) {
        console.error("Error fetching products:", err);
        currentProducts = [];
    }
}

window.updateDetailPanelData = async function(data) {
    document.getElementById('detail-name').innerText = data.name;
    document.getElementById('detail-id').innerText = data.id;
    document.getElementById('detail-type').innerText = data.type;
    document.getElementById('detail-location').innerText = data.location;
    document.getElementById('detail-size').innerText = data.size || '-'; 
    document.getElementById('detail-current').innerText = data.current;
    document.getElementById('detail-max').innerText = data.max;
    
    const percent = data.max > 0 ? (data.current / data.max) * 100 : 0;
    document.getElementById('detail-progress').style.width = percent + '%';
    
    document.getElementById('product-sort').value = 'name-asc';
    
    document.getElementById('product-list').innerHTML = '<p class="text-gray-400 p-4 text-center">กำลังโหลดข้อมูลสินค้า...</p>';
    
    await fetchProductsFromAPI(data.id); 
    
    let initialSort = [...currentProducts].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    renderProducts(initialSort);
};

let activeShelfData = null; 

window.openStockPopup = function(data) {
    activeShelfData = data; 

    document.getElementById('popup-stock-name').innerText = data.name;
    document.getElementById('popup-stock-id').innerText = data.id;
    document.getElementById('popup-stock-location').innerText = data.location;
    document.getElementById('popup-stock-type').innerText = data.type;
    document.getElementById('popup-stock-current').innerText = data.current;
    document.getElementById('popup-stock-max').innerText = data.max;
    
    const percent = data.max > 0 ? (data.current / data.max) * 100 : 0;
    document.getElementById('popup-stock-progress').style.width = percent + '%';
    popup.classList.remove('hidden');
    
    setTimeout(() => {
        popup.classList.remove('scale-95', 'opacity-0');
        popup.classList.add('scale-100', 'opacity-100');
    }, 10);

    if (!detailPanel.classList.contains('translate-x-full')) {
        window.updateDetailPanelData(data);
    }
};

window.showFullDetails = function() {
    if (activeShelfData) {
        window.updateDetailPanelData(activeShelfData);
        detailPanel.classList.remove('translate-x-full');
    }
};

window.closeDetailPanel = function() {
    detailPanel.classList.add('translate-x-full');
};

document.addEventListener('DOMContentLoaded', () => {
    const warehouseSelect = document.getElementById("warehouseSelect");

    async function loadWarehouses() {
        try {
            const response = await fetch('/api/warehouses'); 
            if (!response.ok) throw new Error('Response was not ok'); 
            const warehouses = await response.json(); 
            warehouseSelect.innerHTML = ''; 

            const urlParams = new URLSearchParams(window.location.search);
            const wParam = urlParams.get('w');
            let selectedId = null;

            if (wParam) {
                try { selectedId = atob(wParam); } catch (e) { }
            }

            warehouses.forEach(warehouse => { 
                const option = document.createElement('option'); 
                option.value = warehouse.wh_id; 
                option.textContent = warehouse.wh_name; 
                option.className = "text-black"; 
                if (String(warehouse.wh_id) === selectedId) option.selected = true;
                warehouseSelect.appendChild(option); 
            }); 

        } catch (error) { 
            warehouseSelect.innerHTML = '<option value="" class="text-black" disabled>ไม่สามารถโหลดข้อมูลได้</option>'; 
        }
    }
    
    loadWarehouses(); 

    warehouseSelect.addEventListener("change", function () { 
        if (!this.value) return; 
        const encoded = encodeURIComponent(btoa(this.value)); 
        window.location.href = `/?w=${encoded}`; 
    }); 
});