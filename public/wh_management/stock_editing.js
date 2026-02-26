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

  fetch(`/api/stocks/${stockId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stock_name: nameInput.value,
      capacity: parseInt(capacityInput.value)
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