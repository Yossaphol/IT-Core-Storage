// ===============================
// กำหนดค่าบทบาท พร้อมสีของแต่ละบทบาท
// ===============================
const rolesConfig = {
    manager: { label: "ผู้จัดการ", bg: "bg-[#8A38F5]/25", text: "text-purple-700", border: "border-[#8A38F5]", closeBg: "bg-purple-400", closeHover: "hover:bg-purple-500" },
    sysadmin: { label: "เจ้าหน้าที่ระบบ", bg: "bg-[#EA7987]/25", text: "text-red-600", border: "border-[#EA7987]", closeBg: "bg-red-400", closeHover: "hover:bg-red-500" },
    warehouse: { label: "เจ้าหน้าที่คลังสินค้า", bg: "bg-[#69D1BF]/25", text: "text-[#69D1BF]", border: "border-[#69D1BF]", closeBg: "bg-[#69D1BF]", closeHover: "hover:bg-[#50B5A3]" },
};

// ===============================
// แยกเก็บบทบาทสำหรับ Add และ Edit ไม่ให้ตีกัน
// ===============================
const roleState = {
    add: new Set(),
    edit: new Set()
};

// ===============================
// ฟังก์ชันตั้งค่า Dropdown สำหรับ Modal (ใช้ได้ทั้ง Add และ Edit)
// ===============================
function setupRoleManager(prefix) {
    // หาปุ่มและตัวเลือกตาม Prefix (add_ หรือ edit_)
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

// ===============================
// วาด Tag และอัปเดตตัวเลือก
// ===============================
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

        // สร้าง input ไว้ส่งเข้า Backend
        hiddenInputs.innerHTML += `<input type="hidden" name="roles" value="${roleKey}">`;
    });

    // ซ่อนตัวเลือกที่เลือกไปแล้วใน Dropdown
    options.forEach(opt => {
        if (roleState[prefix].has(opt.getAttribute("data-role"))) {
            opt.classList.add("hidden");
        } else {
            opt.classList.remove("hidden");
        }
    });

    // ถ้ามีบทบาท 1 อันแล้ว ให้ซ่อนปุ่มเพิ่มบทบาท
    if (roleState[prefix].size >= 1) {
        addBtn.classList.add("hidden");
    } else {
        addBtn.classList.remove("hidden");
    }
}

// ===============================
// ลบบทบาทที่คลิกกากบาท
// ===============================
window.removeRole = function(roleKey, prefix) {
    roleState[prefix].delete(roleKey);
    renderTags(prefix);
};

// สั่งให้ระบบผูก Event กับปุ่มต่างๆ ทันทีที่โหลดไฟล์
document.addEventListener("DOMContentLoaded", () => {
    setupRoleManager('add');
    setupRoleManager('edit');
});


// ===============================
// ฟังก์ชัน Preview รูปภาพ (ตอนเพิ่มผู้ใช้)
// ===============================
window.previewAddImage = function(event) {
    const input = event.target;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('add_imgPreview').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// ===============================
// ฟังก์ชัน Preview รูปของ Edit Modal
// ===============================
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

// ===============================
// ฟังก์ชันเปิด Modal แก้ไขและดึงข้อมูลเดิมมาใส่
// ===============================
window.openEditModal = function(id, firstname, lastname, username, role, img) {
    // 1. นำข้อมูลข้อความใส่ในช่อง Input
    document.getElementById('edit_emp_firstname').value = firstname;
    document.getElementById('edit_emp_lastname').value = lastname;
    document.getElementById('edit_username').value = username;

    // 2. ดึงรูปเก่ามาแสดง
    const imgPreview = document.getElementById('edit_imgPreview');
    if (img && img !== 'null' && img !== 'undefined' && img !== '') {
        imgPreview.src = `/images/profile/${img}`; 
    } else {
        imgPreview.src = `/images/profile/user.png`;
    }

    // เคลียร์ input file เก่า
    document.getElementById('edit_imageInput').value = "";

    // 3. จัดการเรื่องบทบาท (Role)
    roleState['edit'].clear(); // ล้างค่าเก่าออกก่อน
    
    if (role && role !== 'null' && role !== 'undefined') {
        const rolesArray = String(role).split(','); 
        
        rolesArray.forEach(r => {
            // แปลงเป็นตัวพิมพ์ใหญ่ทั้งหมด เพื่อให้จับคู่กับ SYSTEM, MANAGER, WAREHOUSE ได้ตรงเป๊ะ
            let dbRole = r.trim().toUpperCase(); 
            let finalRoleKey = "";
            
            // --- จับคู่คำจาก Database เป็น Key ในระบบ ---
            if (dbRole === "MANAGER" || dbRole === "ผู้จัดการ") {
                finalRoleKey = "manager";
            } 
            else if (dbRole === "SYSTEM" || dbRole === "เจ้าหน้าที่ระบบ") {
                // เมื่อเจอคำว่า SYSTEM จะถูกแปลงเป็นคีย์ sysadmin ทันที
                finalRoleKey = "sysadmin"; 
            } 
            else if (dbRole === "WAREHOUSE" || dbRole === "เจ้าหน้าที่คลังสินค้า") {
                finalRoleKey = "warehouse";
            }
            // ----------------------------------------

            // ถ้าได้ค่า Key ที่ถูกต้อง ให้วาด Tag ลงฟอร์ม
            if (finalRoleKey !== "" && rolesConfig[finalRoleKey]) {
                roleState['edit'].add(finalRoleKey);
            }
        });
    }
    
    // สั่งให้วาด Tag บทบาทใหม่ลงบนจอ
    renderTags('edit'); 

    // 4. ตั้งค่า Action ให้ฟอร์ม (ส่ง ID ไปกับ URL ตอนกดยืนยัน)
    document.getElementById('editForm').action = `/user_management/edit/${id}`;

    // 5. แสดง Modal
    document.getElementById('edit-sup-modal').classList.remove('hidden');
};

// ===============================
// จัดการเปิด-ปิด Modal ต่างๆ
// ===============================
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