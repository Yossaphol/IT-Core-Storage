document.addEventListener("DOMContentLoaded", () => {

  const nameInput = document.getElementById("name");
  const capacityInput = document.getElementById("capacity");
  const confirmBtn = document.getElementById("confirm");
  const cancelBtn = document.getElementById("cancel");
  const warehouseSelect = document.getElementById("warehouse");
  const productTypeSelect = document.getElementById("product_type");

  cancelBtn.addEventListener("click", () => {
    window.location = "/warehouse_management/edit";
  });

  confirmBtn.addEventListener("click", createStock);

  async function createStock() {

    const name = nameInput.value.trim();
    const capacity = capacityInput.value.trim();
    const productType = productTypeSelect.value;
    const wh_id = warehouseSelect.value;

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

    const res = await fetch("/api/warehouses/stocks/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stock_name: name,
        capacity: parseInt(capacity),
        wh_id: wh_id,
        product_type: productType
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Create failed");
    }

    await Swal.fire({
      icon: "success",
      title: "สำเร็จ",
      text: "สร้างโซนเก็บสินค้าสำเร็จ",
      confirmButtonText: "ตกลง"
    });

    window.location.href = `/warehouse_management/edit?wh_id=${wh_id}`;

  } catch (err) {

    console.error(err);

    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message
    });

  }
  }

  async function loadProductTypes() {

    try {
      const res = await fetch("/api/product-types");
      const types = await res.json();

      productTypeSelect.innerHTML = "";

      types.forEach(t => {
        const option = document.createElement("option");
        option.value = t.prod_type;
        option.textContent = t.prod_type;
        productTypeSelect.appendChild(option);
      });

    } catch (err) {
      console.error("Load product types error:", err);
    }

  }

  loadProductTypes();

});