let currentProductsInShelf = [];
let editingIndex = null;

const detailPanel = document.getElementById('detail-panel');

export async function loadWarehouses() {

    try {

        const res = await fetch('/api/warehouses');
        const warehouses = await res.json();

        const select = document.getElementById('warehouse');

        select.innerHTML = warehouses.map(w => `
            <option value="${w.wh_id}" class="bg-[#0E1324] text-white">
                ${w.wh_name}
            </option>
        `).join('');

        if (warehouses.length > 0) {
            document.getElementById("wh_name").innerText = warehouses[0].wh_name;
        }

    } catch (err) {

        console.error(err);

    }

}

export function initWarehouseSelector() {

    const select = document.getElementById("warehouse");

    select.addEventListener("change", async (e) => {

        const whId = e.target.value;

        try {

            const res = await fetch(`/api/warehouses/${whId}`);
            const data = await res.json();

            document.getElementById("wh_name").innerText = data.wh_name;
            await window.loadWarehouseLayout(whId);

        } catch (err) {

            console.error(err);

        }

    });

}

export function showShelfDetails(data) {

    document.getElementById('detail-name').innerText = data.name;
    document.getElementById('detail-id').innerText = data.id;
    document.getElementById('detail-current').innerText = data.current;
    document.getElementById('detail-max').innerText = data.max;

    const percent = (data.current / data.max) * 100;
    document.getElementById('detail-progress').style.width = percent + '%';

    currentProductsInShelf = data.items || [];

    document.getElementById('product-sort').value = 'name-asc';

    sortAndRender();

    detailPanel.classList.remove('translate-x-full');

}

export function closeDetailPanel() {
    detailPanel.classList.add('translate-x-full');
}

export function initSorting() {

    document.getElementById('product-sort')
        .addEventListener('change', sortAndRender);

}

function sortAndRender() {

    const sortBy = document.getElementById('product-sort').value;

    let sorted = [...currentProductsInShelf];

    switch (sortBy) {

        case 'name-asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'th'));
            break;

        case 'name-desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name, 'th'));
            break;

        case 'qty-desc':
            sorted.sort((a, b) => b.qty - a.qty);
            break;

        case 'qty-asc':
            sorted.sort((a, b) => a.qty - b.qty);
            break;

        case 'time-desc':
            sorted.sort((a, b) => b.timestamp - a.timestamp);
            break;

        case 'time-asc':
            sorted.sort((a, b) => a.timestamp - b.timestamp);
            break;

    }

    renderProducts(sorted);

}

function renderProducts(products) {

    const list = document.getElementById('product-list');

    if (products.length === 0) {

        list.innerHTML = `
            <div class="text-center py-10 text-gray-500 italic">
                ไม่มีสินค้าในชั้นวางนี้
            </div>
        `;

        return;

    }

    list.innerHTML = products.map((p, index) => `

        <div class="bg-white/5 p-4 rounded-xl border border-white/5 relative group">

            <button data-id="${p.prod_id}"
                class="edit-btn absolute top-3 right-3 text-gray-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full text-xs">

                <i class="fa-solid fa-pencil"></i>

            </button>

            <div class="flex gap-4 items-center">

                <div class="w-14 h-14 bg-white/10 rounded-lg flex-shrink-0 overflow-hidden">
                    <img src="${p.img || '/images/products_img/no-product-image.jpeg'}"
                        class="w-full h-full object-cover">
                </div>

                <div class="flex-1 min-w-0 pr-8">

                    <p class="text-[12px] text-gray-500 uppercase">
                        ${p.sku || 'NO-SKU'}
                    </p>

                    <p class="text-white font-medium truncate">
                        ${p.name}
                    </p>

                    <div class="flex gap-4 mt-2 text-[12px]">

                        <span class="text-blue-300">
                            ประเภท: ${p.type || '-'}
                        </span>

                        <span class="text-[#6DE4B3]">
                            จำนวน: ${p.qty}
                        </span>

                    </div>

                </div>

            </div>

        </div>

    `).join('');

    document.querySelectorAll(".edit-btn").forEach(btn => {

        btn.addEventListener("click", () => {

            openEditModal(btn.dataset.id);

        });

    });

}

export function openEditModal(prodId) {

    const index = currentProductsInShelf.findIndex(p => p.prod_id == prodId);

    editingIndex = index;

    const product = currentProductsInShelf[index];

    document.getElementById('edit-name').innerText = product.name;
    document.getElementById('edit-qty').value = product.qty;

    document.getElementById('edit-modal').classList.remove('hidden');

}

export function closeEditModal() {

    document.getElementById('edit-modal').classList.add('hidden');

}

export async function saveProductChanges() {

    const product = currentProductsInShelf[editingIndex];

    const newQty = parseInt(document.getElementById('edit-qty').value);

    try {

        const res = await fetch("/api/adjustment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                shelf_id: product.shelf_id,
                prod_id: product.prod_id,
                new_amount: newQty
            })
        });

        const data = await res.json();

        if(!data.success){
            throw new Error("Adjustment failed");
        }

        currentProductsInShelf[editingIndex].qty = newQty;

        const total = currentProductsInShelf.reduce((sum,p)=>sum+p.qty,0);

        document.getElementById("detail-current").innerText = total;

        const max = parseInt(document.getElementById("detail-max").innerText);

        document.getElementById("detail-progress").style.width =
            (total / max * 100) + "%";

        closeEditModal();
        sortAndRender();

        Swal.fire({
            icon: "success",
            title: "บันทึกสำเร็จ",
            text: "ปรับจำนวนสินค้าเรียบร้อยแล้ว",
        });

    } catch(err){

        console.error(err);

        Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถปรับจำนวนสินค้าได้",
        });

    }

}

window.closeEditModal = closeEditModal;
window.saveProductChanges = saveProductChanges;
window.openEditModal = openEditModal;