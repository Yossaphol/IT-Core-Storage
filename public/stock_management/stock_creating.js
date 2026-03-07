const stock_name = document.getElementById('name');
const capacity = document.getElementById('capacity');
const warehouse = document.getElementById('warehouse');

const confirmBtn = document.getElementById('confirm');
const cancelBtn = document.getElementById('cancel');

confirmBtn.addEventListener('click', async () => {

  const name = stock_name.value.trim();
  const cap = capacity.value.trim();
  const wh = warehouse.value;

  if (name.length === 0) {
    await Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: "กรุณากรอกชื่อโซนเก็บสินค้า"
    });
    stock_name.focus();
    return;
  }

  if (cap.length === 0) {
    await Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: "กรุณากรอกความจุ"
    });
    capacity.focus();
    return;
  }

  if (isNaN(cap)) {
    await Swal.fire({
      icon: "error",
      title: "ข้อมูลไม่ถูกต้อง",
      text: "ความจุต้องเป็นตัวเลข"
    });
    capacity.focus();
    return;
  }

  if (parseInt(cap) <= 0) {
    await Swal.fire({
      icon: "error",
      title: "ข้อมูลไม่ถูกต้อง",
      text: "ความจุต้องมากกว่า 0"
    });
    capacity.focus();
    return;
  }

  if (!wh) {
    await Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: "กรุณาเลือกคลังสินค้า"
    });
    return;
  }

  try {

    const res = await fetch(`/api/warehouses/stocks/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stock_name: name,
        capacity: parseInt(cap),
        wh_id: parseInt(wh)
      })
    });

    if (!res.ok) throw new Error("Create failed");

    await Swal.fire({
      icon: "success",
      title: "สำเร็จ",
      text: "เพิ่มโซนเก็บสินค้าสำเร็จ",
      confirmButtonText: "ตกลง"
    });

    window.history.back();

  } catch (err) {

    console.error(err);

    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถเพิ่มโซนเก็บสินค้าได้"
    });

  }

});

cancelBtn.addEventListener('click', () => {
  window.location = '/warehouse_management/edit?wh_id=1';
});