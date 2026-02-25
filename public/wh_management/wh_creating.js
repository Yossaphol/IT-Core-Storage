const warehouse_name = document.getElementById('name');
const capacity = document.getElementById('capacity');
const manager = document.getElementById('manager');
const address = document.getElementById('address');

const confirmBtn = document.getElementById('confirm');
const cancel = document.getElementById('cancel');

confirmBtn.addEventListener("click", addWarehouse);

function addWarehouse() {
    const data = {
        wh_name: warehouse_name.value,
        capacity: parseInt(capacity.value),
        username: manager.value,
        address: address.value
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