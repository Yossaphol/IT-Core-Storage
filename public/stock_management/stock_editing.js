const stockId = document.getElementById("stockId").value;
const nameInput = document.getElementById("name");
const capacityInput = document.getElementById("capacity");
const confirmBtn = document.getElementById("confirm");
const cancelBtn = document.getElementById("cancel");
const warehouseId = document.getElementById("warehouseId").value;

cancelBtn.addEventListener("click", () => {
    window.location = `/warehouse_management/edit?wh_id=${warehouseId}`;
});

confirmBtn.addEventListener("click", updateStock);

async function updateStock() {

  const name = nameInput.value.trim();
  const capacity = capacityInput.value.trim();

  if (name.length === 0) {
    await Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: "กรุณากรอกชื่อโซนเก็บสินค้า"
    });
    nameInput.focus();
    return;
  }

  if (capacity.length === 0) {
    await Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: "กรุณากรอกความจุโซนเก็บสินค้า"
    });
    capacityInput.focus();
    return;
  }

  if (isNaN(capacity)) {
    await Swal.fire({
      icon: "error",
      title: "ข้อมูลไม่ถูกต้อง",
      text: "ความจุต้องเป็นตัวเลข"
    });
    capacityInput.focus();
    return;
  }

  if (parseInt(capacity) <= 0) {
    await Swal.fire({
      icon: "error",
      title: "ข้อมูลไม่ถูกต้อง",
      text: "ความจุต้องมากกว่า 0"
    });
    capacityInput.focus();
    return;
  }

  try {

    const res = await fetch(`/api/stocks/${stockId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stock_name: name,
        capacity: parseInt(capacity)
      })
    });

    if (!res.ok) throw new Error("Update failed");

    await Swal.fire({
      icon: "success",
      title: "สำเร็จ",
      text: "แก้ไขโซนเก็บสินค้าสำเร็จ",
      confirmButtonText: "ตกลง"
    });

    window.history.back();

  } catch (err) {

    console.error(err);

    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถแก้ไขข้อมูลได้"
    });

  }
}