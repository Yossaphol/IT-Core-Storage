document.addEventListener("DOMContentLoaded", function() {
    const dateInput = document.getElementById('date_time');
    
    // สร้างวันที่ปัจจุบัน
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    // รวมเป็นรูปแบบ dd/mm/yyyy ตามที่กำหนดไว้ใน datepicker-format
    const todayStr = dd + '/' + mm + '/' + yyyy;

    // ใส่ค่าลงใน Input
    dateInput.value = todayStr;
});