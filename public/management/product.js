function changeLimit(newLimit) {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'DESC';
    window.location.href = `/product_management?page=1&limit=${newLimit}&search=${search}&sort=${sort}`;
}

document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeEditModal();
                closeDeleteModal();
            }
        });

        function confirmDelete(id, name) {
            document.getElementById('deleteForm').action = `/product_management/delete/${id}`;
            document.getElementById('deleteModal').classList.remove('hidden');
        }

        function closeDeleteModal() {
            document.getElementById('deleteModal').classList.add('hidden');
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeDeleteModal();
        });

        document.getElementById('deleteModal').addEventListener('click', function(e) {
            if (e.target === this) closeDeleteModal();
        });

        const modal = document.getElementById('add-sup-modal');

        function openModal() {
            modal.classList.remove('hidden');
        }

        function closeModal() {
            modal.classList.add('hidden');
        }


function handleSearch() {
    const keyword = document.getElementById('searchInput').value;
    const limit = document.getElementById('limitSelect').value;
    const currentSort = '<%= sort %>';

    window.location.href = `/product_management?page=1&limit=${limit}&search=${encodeURIComponent(keyword)}&sort=${currentSort}`;
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

const checkAll = document.getElementById('checkAll');
const rowChecks = document.querySelectorAll('.row-check');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

function updateBulkDeleteButton() {
    const checkedCount = document.querySelectorAll('.row-check:checked').length;
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const tableContainer = document.getElementById('tableContainer');
    const checkAll = document.getElementById('checkAll');
    const rowChecks = document.querySelectorAll('.row-check');
            
    if (checkedCount > 0) {
        bulkDeleteBtn.classList.remove('hidden');
                
    if(tableContainer) tableContainer.style.transform = "translateY(45px)";
    } else {
    bulkDeleteBtn.classList.add('hidden');

    if(tableContainer) tableContainer.style.transform = "translateY(0)";
    }

    if (checkAll && rowChecks.length > 0) {
        checkAll.checked = checkedCount === rowChecks.length;
    }
}

rowChecks.forEach(check => {
    check.addEventListener('change', updateBulkDeleteButton);
});

if (checkAll) {
    checkAll.addEventListener('change', function() {
        rowChecks.forEach(check => {
            check.checked = this.checked;
        });
        updateBulkDeleteButton();
    });
        
}

document.getElementById('bulkDeleteBtn').addEventListener('click', function() {
    const checkedBoxes = document.querySelectorAll('.row-check:checked');
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (selectedIds.length === 0) return;

    document.getElementById('deleteForm').action = '/product_management/bulk-delete';
    document.getElementById('deleteIdsInput').value = selectedIds.join(',');
    document.getElementById('deleteModal').classList.remove('hidden');
});

function previewAddImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('add_imgPreview');
    
    if (file) {
        preview.src = URL.createObjectURL(file);
    } else {
        preview.src = '/images/products_img/no-product-image.jpeg';
    }
}

function openEditModal(button) {
    // 1. ดึงข้อมูลจาก data-attributes ของปุ่มที่ถูกกด
    const id = button.getAttribute('data-id');
    const code = button.getAttribute('data-code');
    const name = button.getAttribute('data-name');
    const brand = button.getAttribute('data-brand');
    const type = button.getAttribute('data-type');
    const description = button.getAttribute('data-desc');
    const imgPath = button.getAttribute('data-img');

    // 2. นำข้อมูลไปใส่ใน Input แต่ละช่อง
    document.getElementById('edit_prod_code').value = code || '';
    document.getElementById('edit_prod_name').value = name || '';
    document.getElementById('edit_brand').value = brand || '';
    document.getElementById('edit_prod_type').value = type || 'Other';
    document.getElementById('edit_description').value = description || ''; // นำคำอธิบายมาใส่

    // 3. จัดการรูปภาพพรีวิว
    const imgPreview = document.getElementById('edit_imgPreview');
    
    // เช็คว่ามีรูปภาพไหม (ต้องไม่ใช่ค่าว่าง, null, หรือ undefined)
    if (imgPath && imgPath !== 'null' && imgPath !== 'undefined' && imgPath !== '') {
        imgPreview.src = imgPath; // ตอนนี้ใน DB เป็น Path เต็มแล้ว ใส่ได้เลย
    } else {
        imgPreview.src = '/images/products_img/no-product-image.jpeg';
    }

    // เคลียร์ค่า input file เผื่อผู้ใช้เคยเลือกรูปค้างไว้
    document.getElementById('edit_imageInput').value = "";

    // 4. กำหนด URL ปลายทางสำหรับการ Update
    document.getElementById('editForm').action = `/product_management/edit/${id}`;

    // 5. แสดง Modal
    document.getElementById('edit-product-modal').classList.remove('hidden');
}

// ฟังก์ชันสำหรับพรีวิวรูปตอนเลือกไฟล์ใหม่ (ยังใช้เหมือนเดิม)
function previewEditImage(event) {
    const input = event.target;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('edit_imgPreview').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function closeEditModal() {
    document.getElementById('edit-product-modal').classList.add('hidden');
}

function handleSort(sortValue) {
    const searchInput = document.getElementById('searchInput');
    const limitSelect = document.getElementById('limitSelect');
    
    const keyword = searchInput ? searchInput.value : '';
    const limit = limitSelect ? limitSelect.value : 10;
    
    window.location.href = `/product_management?page=1&limit=${limit}&search=${encodeURIComponent(keyword)}&sort=${sortValue}`;
}