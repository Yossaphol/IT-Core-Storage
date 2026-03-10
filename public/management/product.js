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

// window.openEditModal = function(id, prod_name, prod_code, brand, prod_type, amount, prod_img) {

//     document.getElementById('edit_emp_firstname').value = firstname;
//     document.getElementById('edit_emp_lastname').value = lastname;
//     document.getElementById('edit_username').value = username;

//     const imgPreview = document.getElementById('edit_imgPreview');
//     if (img && img !== 'null' && img !== 'undefined' && img !== '') {
//         imgPreview.src = `/images/profile/${img}`; 
//     } else {
//         imgPreview.src = `/images/profile/user.png`;
//     }

//     document.getElementById('edit_imageInput').value = "";

//     roleState['edit'].clear();
    
//     if (role && role !== 'null' && role !== 'undefined') {
//         const rolesArray = String(role).split(','); 
        
//         rolesArray.forEach(r => {
//             let dbRole = r.trim().toUpperCase(); 
//             let finalRoleKey = "";
            
//             if (dbRole === "MANAGER" || dbRole === "ผู้จัดการ") {
//                 finalRoleKey = "manager";
//             } 
//             else if (dbRole === "SYSTEM" || dbRole === "เจ้าหน้าที่ระบบ") {
//                 finalRoleKey = "system"; 
//             } 
//             else if (dbRole === "WAREHOUSE" || dbRole === "เจ้าหน้าที่คลังสินค้า") {
//                 finalRoleKey = "warehouse";
//             }

//             if (finalRoleKey !== "" && rolesConfig[finalRoleKey]) {
//                 roleState['edit'].add(finalRoleKey);
//             }
//         });
//     }
    
//     renderTags('edit'); 

//     document.getElementById('editForm').action = `/user_management/edit/${id}`;

//     document.getElementById('edit-sup-modal').classList.remove('hidden');
// };

// window.closeEditModal = function() {
//     document.getElementById('edit-sup-modal').classList.add('hidden');
// };