
const rolesConfig = {
    manager: { label: "ผู้จัดการ", bg: "bg-[#8A38F5]/25", text: "text-purple-700", border: "border-[#8A38F5]", closeBg: "bg-purple-400", closeHover: "hover:bg-purple-500" },
    system: { label: "เจ้าหน้าที่ระบบ", bg: "bg-[#EA7987]/25", text: "text-red-600", border: "border-[#EA7987]", closeBg: "bg-red-400", closeHover: "hover:bg-red-500" },
    warehouse: { label: "เจ้าหน้าที่คลังสินค้า", bg: "bg-[#69D1BF]/25", text: "text-[#69D1BF]", border: "border-[#69D1BF]", closeBg: "bg-[#69D1BF]", closeHover: "hover:bg-[#50B5A3]" },
};

const roleState = {
    add: new Set(),
    edit: new Set()
};

function setupRoleManager(prefix) {

    const addBtn = document.getElementById(`${prefix}_addRoleBtn`);
    const dropdown = document.getElementById(`${prefix}_roleDropdown`);
    
    if (!addBtn || !dropdown) return;
    
    const options = dropdown.querySelectorAll(".role-option");

    addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== addBtn) {
            dropdown.classList.add("hidden");
        }
    });

    options.forEach(opt => {
        opt.addEventListener("click", () => {
            const roleKey = opt.getAttribute("data-role");
            
            roleState[prefix].clear(); 
            roleState[prefix].add(roleKey);
            
            renderTags(prefix);
            dropdown.classList.add("hidden");
        });
    });
}

function renderTags(prefix) {
    const container = document.getElementById(`${prefix}_selectedRoles`);
    const hiddenInputs = document.getElementById(`${prefix}_hiddenInputs`);
    const dropdown = document.getElementById(`${prefix}_roleDropdown`);
    const addBtn = document.getElementById(`${prefix}_addRoleBtn`);
    
    if(!container || !hiddenInputs) return;

    const options = dropdown.querySelectorAll(".role-option");

    container.innerHTML = "";
    hiddenInputs.innerHTML = "";

    roleState[prefix].forEach(roleKey => {
        const config = rolesConfig[roleKey];
        
        container.innerHTML += `
        <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-2 ${config.bg} ${config.text} ${config.border} text-base font-medium animate-fadeIn">
            ${config.label}
            <button type="button" class="w-5 h-5 flex items-center justify-center rounded-full ${config.closeBg} ${config.closeHover} text-white transition-colors ml-1" 
                    onclick="removeRole('${roleKey}', '${prefix}')">
                <i class="fa-solid fa-xmark w-3.5"></i>
            </button>
        </span>`;

        hiddenInputs.innerHTML += `<input type="hidden" name="roles" value="${roleKey}">`;
    });

    options.forEach(opt => {
        if (roleState[prefix].has(opt.getAttribute("data-role"))) {
            opt.classList.add("hidden");
        } else {
            opt.classList.remove("hidden");
        }
    });

    if (roleState[prefix].size >= 1) {
        addBtn.classList.add("hidden");
    } else {
        addBtn.classList.remove("hidden");
    }
}

window.removeRole = function(roleKey, prefix) {
    roleState[prefix].delete(roleKey);
    renderTags(prefix);
};

document.addEventListener("DOMContentLoaded", () => {
    setupRoleManager('add');
    setupRoleManager('edit');
});

function previewAddImage(event) {
    const input = event.target;
    const preview = document.getElementById('add_imgPreview'); // ID ของ <img> คุณ

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
        };

        reader.readAsDataURL(input.files[0]);
    }
}
window.previewEditImage = function(event) {
    const input = event.target;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('edit_imgPreview').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.openEditModal = function(id, firstname, lastname, username, role, img) {

    document.getElementById('edit_emp_firstname').value = firstname;
    document.getElementById('edit_emp_lastname').value = lastname;
    document.getElementById('edit_username').value = username;

    const imgPreview = document.getElementById('edit_imgPreview');
    if (img && img !== 'null' && img !== 'undefined' && img !== '') {
        imgPreview.src = `/images/profile/${img}`; 
    } else {
        imgPreview.src = `/images/profile/user.png`;
    }

    document.getElementById('edit_imageInput').value = "";

    roleState['edit'].clear();
    
    if (role && role !== 'null' && role !== 'undefined') {
        const rolesArray = String(role).split(','); 
        
        rolesArray.forEach(r => {
            let dbRole = r.trim().toUpperCase(); 
            let finalRoleKey = "";
            
            if (dbRole === "MANAGER" || dbRole === "ผู้จัดการ") {
                finalRoleKey = "manager";
            } 
            else if (dbRole === "SYSTEM" || dbRole === "เจ้าหน้าที่ระบบ") {
                finalRoleKey = "system"; 
            } 
            else if (dbRole === "WAREHOUSE" || dbRole === "เจ้าหน้าที่คลังสินค้า") {
                finalRoleKey = "warehouse";
            }

            if (finalRoleKey !== "" && rolesConfig[finalRoleKey]) {
                roleState['edit'].add(finalRoleKey);
            }
        });
    }
    
    renderTags('edit'); 

    document.getElementById('editForm').action = `/user_management/edit/${id}`;

    document.getElementById('edit-sup-modal').classList.remove('hidden');
};

window.closeEditModal = function() {
    document.getElementById('edit-sup-modal').classList.add('hidden');
};

window.confirmDelete = function(id, name) {
    document.getElementById('deleteForm').action = `/user_management/delete/${id}`;
    document.getElementById('deleteModal').classList.remove('hidden');
};

window.closeDeleteModal = function() {
    document.getElementById('deleteModal').classList.add('hidden');
};

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeEditModal();
        closeDeleteModal();
    }
});

document.getElementById('deleteModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeDeleteModal();
});

document.addEventListener('DOMContentLoaded', function () {
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
                        
            if(tableContainer) tableContainer.style.transform = "translateY(55px)";
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

        document.getElementById('deleteForm').action = '/user_management/bulk-delete';
        document.getElementById('deleteIdsInput').value = selectedIds.join(',');
        document.getElementById('deleteModal').classList.remove('hidden');
    });
});

function handleSort(sortValue) {
    const searchInput = document.getElementById('searchInput');
    const limitSelect = document.getElementById('limitSelect');
    
    const keyword = searchInput ? searchInput.value : '';
    const limit = limitSelect ? limitSelect.value : 10;
    
    window.location.href = `/user_management?page=1&limit=${limit}&search=${encodeURIComponent(keyword)}&sort=${sortValue}`;
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const limitSelect = document.getElementById('limitSelect');
    
    const keyword = searchInput ? searchInput.value : '';
    const limit = limitSelect ? limitSelect.value : 10;
    
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort') || '';

    window.location.href = `/user_management?page=1&limit=${limit}&search=${encodeURIComponent(keyword)}&sort=${currentSort}`;
}

function changeLimit(value) {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput ? searchInput.value : '';
    
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort') || '';
            
    window.location.href = `/user_management?page=1&limit=${value}&search=${encodeURIComponent(keyword)}&sort=${currentSort}`;
}