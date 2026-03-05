const warehouse_name = document.getElementById('name');
const capacity = document.getElementById('capacity');
const manager = document.getElementById('manager');
const address = document.getElementById('address');

const confirmBtn = document.getElementById('confirm');

confirmBtn.addEventListener("click", addWarehouse);

loadManagers();

function validateForm() {

    if (!warehouse_name.value.trim()) {
        alert("กรุณากรอกชื่อคลังสินค้า");
        warehouse_name.focus();
        return false;
    }

    if (!capacity.value.trim()) {
        alert("กรุณากรอกความจุคลังสินค้า");
        capacity.focus();
        return false;
    }

    if (isNaN(capacity.value) || parseInt(capacity.value) <= 0) {
        alert("ความจุต้องเป็นตัวเลขมากกว่า 0");
        capacity.focus();
        return false;
    }

    if (!manager.value) {
        alert("กรุณาเลือกผู้ดูแลคลัง");
        manager.focus();
        return false;
    }

    if (!address.value.trim()) {
        alert("กรุณากรอกสถานที่ตั้งคลัง");
        address.focus();
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
        alert("เพิ่มคลังสินค้าสำเร็จ");

        warehouse_name.value = '';
        capacity.value = '';
        manager.value = '';
        address.value = '';

        window.location = '/warehouse_management'
    })
    .catch(err => {
        alert("เกิดข้อผิดพลาด");
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
    .catch(err => console.error(err));
}