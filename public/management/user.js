
const rolesConfig = {
    manager: { label: "ผู้จัดการ", bg: "bg-[#8A38F5]/25", text: "text-purple-700", border: "border-[#8A38F5]", closeBg: "bg-purple-400", closeHover: "hover:bg-purple-500" },
    system: { label: "เจ้าหน้าที่ระบบ", bg: "bg-[#EA7987]/25", text: "text-red-600", border: "border-[#EA7987]", closeBg: "bg-red-400", closeHover: "hover:bg-red-500" },
    warehouse: { label: "เจ้าหน้าที่คลังสินค้า", bg: "bg-[#69D1BF]/25", text: "text-[#69D1BF]", border: "border-[#69D1BF]", closeBg: "bg-[#69D1BF]", closeHover: "hover:bg-[#50B5A3]" },
};

// แยกเก็บบทบาทสำหรับ Add และ Edit
const roleState = {
    add: new Set(),
    edit: new Set()
};

// ฟังก์ชันตั้งค่า Dropdown สำหรับ Modal (ใช้ได้ทั้ง Add และ Edit)
function setupRoleManager(prefix) {

    const addBtn = document.getElementById(`${prefix}_addRoleBtn`);
    const dropdown = document.getElementById(`${prefix}_roleDropdown`);
    
    if (!addBtn || !dropdown) return; // ถ้าหาไม่เจอให้ข้ามไป
    
    const options = dropdown.querySelectorAll(".role-option");

    // เปิด/ปิด Dropdown
    addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("hidden");
    });

    // ปิดเมื่อคลิกที่อื่น
    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== addBtn) {
            dropdown.classList.add("hidden");
        }
    });

    // เมื่อคลิกเลือกบทบาท
    options.forEach(opt => {
        opt.addEventListener("click", () => {
            const roleKey = opt.getAttribute("data-role");
            
            // ล้างค่าเดิม เพื่อให้เลือกได้แค่อันเดียว
            roleState[prefix].clear(); 
            roleState[prefix].add(roleKey);
            
            renderTags(prefix);
            dropdown.classList.add("hidden");
        });
    });
}

// วาด Tag และอัปเดตตัวเลือก
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
        
        // สร้าง Tag
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

// สั่งให้ระบบผูก Event กับปุ่มต่างๆ ทันทีที่โหลดไฟล์
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
            // เปลี่ยน src ของรูปเป็นข้อมูลไฟล์ที่เพิ่งเลือก
            preview.src = e.target.result;
        };

        reader.readAsDataURL(input.files[0]);
    }
}

// ฟังก์ชัน Preview รูปของ Edit Modal
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

// ฟังก์ชันเปิด Modal แก้ไขและดึงข้อมูลเดิมมาใส่
window.openEditModal = function(id, firstname, lastname, username, role, img) {

    document.getElementById('edit_emp_firstname').value = firstname;
    document.getElementById('edit_emp_lastname').value = lastname;
    document.getElementById('edit_username').value = username;

    // ดึงรูปเก่ามาแสดง
    const imgPreview = document.getElementById('edit_imgPreview');
    if (img && img !== 'null' && img !== 'undefined' && img !== '') {
        imgPreview.src = `/images/profile/${img}`; 
    } else {
        imgPreview.src = `/images/profile/user.png`;
    }

    // เคลียร์ input file เก่า
    document.getElementById('edit_imageInput').value = "";

    // จัดการเรื่องบทบาท (Role)
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

// จัดการเปิด-ปิด Modal ต่างๆ
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
    // Checkbox Func
        const checkAll = document.getElementById('checkAll');
        const rowChecks = document.querySelectorAll('.row-check');
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    // ฟังก์ชันเช็กว่ามีการติ๊ก Checkbox แถวไหนอยู่บ้าง
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

        // อัปเดต Checkbox หัวตาราง
        if (checkAll && rowChecks.length > 0) {
            checkAll.checked = checkedCount === rowChecks.length;
        }
    }

    // 1. ดักจับเมื่อคลิก Checkbox ทีละแถว
    rowChecks.forEach(check => {
        check.addEventListener('change', updateBulkDeleteButton);
    });

    // 2. ดักจับเมื่อคลิก Checkbox หัวตาราง (เลือกทั้งหมด/ยกเลิกทั้งหมด)
    if (checkAll) {
        checkAll.addEventListener('change', function() {
            rowChecks.forEach(check => {
                check.checked = this.checked;
            });
            updateBulkDeleteButton();
        });
    }

    //  Delete Func
    document.getElementById('bulkDeleteBtn').addEventListener('click', function() {
        const checkedBoxes = document.querySelectorAll('.row-check:checked');
        const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);

        // ป้องกันกรณีไม่มีการเลือก (ถึงปกติปุ่มจะซ่อนอยู่ก็ดักไว้ก่อนเพื่อความชัวร์)
        if (selectedIds.length === 0) return;

        document.getElementById('deleteForm').action = '/user_management/bulk-delete';
        document.getElementById('deleteIdsInput').value = selectedIds.join(',');
        document.getElementById('deleteModal').classList.remove('hidden');
    });
});

// ฟังก์ชันจัดการการเรียงลำดับ (Sort)
function handleSort(sortValue) {
    const searchInput = document.getElementById('searchInput');
    const limitSelect = document.getElementById('limitSelect');
    
    const keyword = searchInput ? searchInput.value : '';
    const limit = limitSelect ? limitSelect.value : 10;
    
    // เมื่อกดเปลี่ยนการกรอง ให้กลับไปเริ่มที่หน้า 1 เสมอ
    window.location.href = `/user_management?page=1&limit=${limit}&search=${encodeURIComponent(keyword)}&sort=${sortValue}`;
}

// อัปเดตฟังก์ชัน handleSearch ให้รักษาค่า Sort เดิมไว้ด้วย
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const limitSelect = document.getElementById('limitSelect');
    
    const keyword = searchInput ? searchInput.value : '';
    const limit = limitSelect ? limitSelect.value : 10;
    
    // ดึงค่า sort ปัจจุบันจาก URL เพื่อไม่ให้ค่าหายเวลาค้นหา
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort') || '';

    window.location.href = `/user_management?page=1&limit=${limit}&search=${encodeURIComponent(keyword)}&sort=${currentSort}`;
}

// อัปเดตฟังก์ชัน changeLimit ให้รักษาค่า Sort เดิมไว้ด้วย
function changeLimit(value) {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput ? searchInput.value : '';
    
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort') || '';
            
    window.location.href = `/user_management?page=1&limit=${value}&search=${encodeURIComponent(keyword)}&sort=${currentSort}`;
}