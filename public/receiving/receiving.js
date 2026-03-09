document.getElementById('receivingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const prodName = document.getElementById('prod_name').value.trim();
    const prodCode = document.getElementById('prod_code').value.trim();
    const brand = document.getElementById('brand').value.trim();
    const prodType = document.getElementById('prod_type').value;
    const amount = document.getElementById('amount').value;
    const empId = document.getElementById('emp_id').value;
    const date = document.getElementById('date_time_display').value.trim();
    const compName = document.getElementById('comp_name').value.trim();

    if (!prodName) {
        return Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบ',
            text: 'กรุณากรอกชื่อสินค้า'
        });
    }

    if (!prodCode) {
        return Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบ',
            text: 'กรุณากรอกรหัสสินค้า'
        });
    }

    if (!amount) {
        return Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบ',
            text: 'กรุณากรอกจำนวนสินค้า'
        });
    }

    if (isNaN(amount) || parseInt(amount) <= 0) {
        return Swal.fire({
            icon: 'error',
            title: 'ข้อมูลไม่ถูกต้อง',
            text: 'จำนวนต้องเป็นตัวเลขมากกว่า 0'
        });
    }

    if (!empId) {
        return Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบ',
            text: 'กรุณาเลือกเจ้าหน้าที่รับเข้า'
        });
    }

    if (!date) {
        return Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบ',
            text: 'กรุณาเลือกวันที่รับสินค้า'
        });
    }

    if (!compName) {
        return Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบ',
            text: 'กรุณากรอกชื่อผู้ส่งสินค้า'
        });
    }

    const data = {
        prod_name: prodName,
        prod_code: prodCode,
        brand: brand,
        prod_type: prodType,
        amount: parseInt(amount),
        emp_id: empId,
        date_time_display: date,
        comp_name: compName
    };

    try {

        const confirm = await Swal.fire({
            icon: 'question',
            title: 'ยืนยันการรับสินค้า',
            text: 'ต้องการบันทึกรายการรับสินค้านี้หรือไม่',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirm.isConfirmed) return;

        const response = await fetch('/api/receiving/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {

            await Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: result.message,
                confirmButtonText: 'ตกลง'
            });

            window.location.reload();

        } else {

            Swal.fire({
                icon: 'error',
                title: 'ล้มเหลว',
                text: result.error
            });

        }

    } catch (err) {

        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
        });

    }
});