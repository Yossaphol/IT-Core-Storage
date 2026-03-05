const stock_name = document.getElementById('name');
const capacity = document.getElementById('capacity');
const warehouse = document.getElementById('warehouse');

const confirmBtn = document.getElementById('confirm');
const cancelBtn = document.getElementById('cancel');

confirmBtn.addEventListener('click', () => {

  const name = stock_name.value.trim();
  const cap = capacity.value.trim();
  const wh = warehouse.value;

  if (name.length === 0) {
    alert("กรุณากรอกชื่อสินค้าคงคลัง");
    stock_name.focus();
    return;
  }

  if (cap.length === 0) {
    alert("กรุณากรอกความจุ");
    capacity.focus();
    return;
  }

  if (isNaN(cap)) {
    alert("ความจุต้องเป็นตัวเลข");
    capacity.focus();
    return;
  }

  if (parseInt(cap) <= 0) {
    alert("ความจุต้องมากกว่า 0");
    capacity.focus();
    return;
  }

  if (!wh) {
    alert("กรุณาเลือกคลังสินค้า");
    return;
  }

  fetch(`/api/warehouses/stocks/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stock_name: name,
      capacity: parseInt(cap),
      wh_id: parseInt(wh)
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Create failed");
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

cancelBtn.addEventListener('click', () => {
  window.location = '/warehouse_management/edit?wh_id=1';
});