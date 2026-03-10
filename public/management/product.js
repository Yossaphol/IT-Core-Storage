function changeLimit(newLimit) {
    // ดึงค่าพารามิเตอร์ปัจจุบันจาก URL
    const urlParams = new URLSearchParams(window.location.search);
    // เก็บค่า search และ sort เดิมไว้ (ถ้าไม่มีให้เป็นค่าว่าง หรือ DESC)
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'DESC';
    // รีเฟรชหน้าเว็บโดยส่ง limit ใหม่ไป และกลับไปเริ่มที่ page=1
    window.location.href = `/product_management?page=1&limit=${newLimit}&search=${search}&sort=${sort}`;
}