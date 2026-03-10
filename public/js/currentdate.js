document.addEventListener("DOMContentLoaded", function() {
    const dateInput = document.getElementById('date_time');
    
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    const todayStr = dd + '/' + mm + '/' + yyyy;

    // ใส่ค่าลงใน Inut
    dateInput.value = todayStr;
});