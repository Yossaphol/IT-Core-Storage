const stock_name = document.getElementById('name');
const capacity = document.getElementById('capacity');
const warehouse = document.getElementById('warehouse');

const confirmBtn = document.getElementById('confirm');
const cancelBtn = document.getElementById('cancel');

confirmBtn.addEventListener('click', () => {
    fetch(`/api/warehouses/stocks/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stock_name: stock_name.value,
      capacity: parseInt(capacity.value),
      wh_id: parseInt(warehouse.value)
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Update failed");
    return res.json();
  })
  .then(() => {
    alert("เพิ่มสำเร็จ");
    window.history.back();
  })
  .catch(err => {
    console.error(err);
    alert("เกิดข้อผิดพลาด");
  });
});

cancelBtn.addEventListener('click', () => window.location = '/warehouse_management/edit?wh_id=1');