const deleteBtn = document.getElementById("delete-stock-btn");
const warehouseId = document.getElementById("activeWarehouseId").value;

deleteBtn.addEventListener("click", async () => {

    if (!warehouseId) return;

    const result = await Swal.fire({
        icon: "warning",
        title: "ยืนยันการลบ",
        text: "คุณต้องการลบคลังสินค้านี้หรือไม่",
        showCancelButton: true,
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6"
    });

    if (!result.isConfirmed) return;

    try {

        const res = await fetch(`/api/warehouses/${warehouseId}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error();

        await Swal.fire({
            icon: "success",
            title: "ลบสำเร็จ",
            text: "คลังสินค้าถูกลบแล้ว",
            confirmButtonText: "ตกลง"
        });

        window.location.href = "/warehouse_management";

    } catch (err) {

        Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถลบคลังสินค้าได้"
        });

    }

});