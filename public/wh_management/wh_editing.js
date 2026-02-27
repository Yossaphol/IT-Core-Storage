const deleteBtn = document.getElementById("delete-warehouse-btn");
const warehouseId = document.getElementById("activeWarehouseId").value;

deleteBtn.addEventListener("click", async () => {

    if (!warehouseId) return;

    if (!confirm("ยืนยันการลบคลังสินค้านี้?")) return;

    try {
        const res = await fetch(`/api/warehouses/${warehouseId}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error();

        alert("ลบสำเร็จ");
        window.location.href = "/warehouse_management";

    } catch (err) {
        alert("ไม่สามารถลบได้");
    }
});