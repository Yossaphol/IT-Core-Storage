const warehouse_name = document.getElementById('name');
const capacity = document.getElementById('capacity');
const manager = document.getElementById('manager');
const address = document.getElementById('address');

const confirmBtn = document.getElementById('confirm');

confirmBtn.addEventListener("click", addWarehouse);

loadManagers();

function validateForm() {

    if (!warehouse_name.value.trim()) {
        Swal.fire({
            icon: "warning",
            title: "ข้อมูลไม่ครบ",
            text: "กรุณากรอกชื่อคลังสินค้า"
        }).then(() => warehouse_name.focus());
        return false;
    }

    if (!capacity.value.trim()) {
        Swal.fire({
            icon: "warning",
            title: "ข้อมูลไม่ครบ",
            text: "กรุณากรอกความจุคลังสินค้า"
        }).then(() => capacity.focus());
        return false;
    }

    if (isNaN(capacity.value) || parseInt(capacity.value) <= 0) {
        Swal.fire({
            icon: "error",
            title: "ข้อมูลไม่ถูกต้อง",
            text: "ความจุต้องเป็นตัวเลขมากกว่า 0"
        }).then(() => capacity.focus());
        return false;
    }

    if (!manager.value) {
        Swal.fire({
            icon: "warning",
            title: "ข้อมูลไม่ครบ",
            text: "กรุณาเลือกผู้ดูแลคลัง"
        }).then(() => manager.focus());
        return false;
    }

    if (!address.value.trim()) {
        Swal.fire({
            icon: "warning",
            title: "ข้อมูลไม่ครบ",
            text: "กรุณากรอกสถานที่ตั้งคลัง"
        }).then(() => address.focus());
        return false;
    }

    return true;
}

function addWarehouse() {

    if (!validateForm()) return;

    const data = {
        wh_name: warehouse_name.value.trim(),
        capacity: parseInt(capacity.value),
        username: manager.value,
        address: address.value.trim()
    };

    fetch("/api/warehouses/add", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("Server error");
        }
        return res.json();
    })
    .then(result => {

        Swal.fire({
            icon: "success",
            title: "สำเร็จ",
            text: "เพิ่มคลังสินค้าสำเร็จ",
            confirmButtonText: "ตกลง"
        }).then(() => {

            warehouse_name.value = '';
            capacity.value = '';
            manager.value = '';
            address.value = '';

            window.location = '/warehouse_management';

        });

    })
    .catch(err => {

        Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถเพิ่มคลังสินค้าได้"
        });

        console.error(err);
    });

}

function loadManagers() {

    fetch("/api/warehouses/managers")
    .then(res => res.json())
    .then(data => {

        data.forEach(emp => {

            const option = document.createElement("option");

            option.value = emp.username;
            option.textContent =
                emp.emp_firstname + " " + emp.emp_lastname +
                " (" + emp.username + ")";

            manager.appendChild(option);

        });

    })
    .catch(err => {

        Swal.fire({
            icon: "error",
            title: "โหลดข้อมูลไม่สำเร็จ",
            text: "ไม่สามารถโหลดรายชื่อผู้ดูแลคลังได้"
        });

        console.error(err);
    });

}