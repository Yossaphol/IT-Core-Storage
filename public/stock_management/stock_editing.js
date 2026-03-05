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

function updateStock() {

  const name = nameInput.value.trim();
  const capacity = capacityInput.value.trim();

  if (name.length === 0) {
    alert("กรุณากรอกชื่อสินค้าคงคลัง");
    nameInput.focus();
    return;
  }

  if (capacity.length === 0) {
    alert("กรุณากรอกความจุสินค้าคงคลัง");
    capacityInput.focus();
    return;
  }

  if (isNaN(capacity)) {
    alert("ความจุต้องเป็นตัวเลข");
    capacityInput.focus();
    return;
  }

  if (parseInt(capacity) <= 0) {
    alert("ความจุต้องมากกว่า 0");
    capacityInput.focus();
    return;
  }

  fetch(`/api/stocks/${stockId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stock_name: name,
      capacity: parseInt(capacity)
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Update failed");
    return res.json();
  })
  .then(() => {
    alert("แก้ไขสำเร็จ");
    window.history.back();
  })
  .catch(err => {
    console.error(err);
    alert("เกิดข้อผิดพลาด");
  });
}