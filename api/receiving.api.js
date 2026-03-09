const pool = require("../db");

const getReceivingPage = async (req, res) => {
    try {
        // 1. รายการที่เข้าคลังสำเร็จ (แสดงใน Table รายการล่าสุด)
        // เงื่อนไข: เป็นรายการ receive ที่มี prod_id ปรากฏอยู่ใน shelf_items แล้ว
        const [latestItems] = await pool.query(`
            SELECT DISTINCT st.trans_id, st.amount, st.date_time, p.prod_name, p.prod_img, s.comp_name, e.emp_firstname, e.emp_lastname 
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            JOIN suppliers s ON st.sup_id = s.sup_id
            JOIN employees e ON st.emp_id = e.emp_id
            JOIN shelf_items si ON st.prod_id = si.prod_id
            WHERE st.type = 'receive'
            ORDER BY st.date_time DESC LIMIT 10
        `);

        // 2. สินค้ารอเข้าคลัง (แสดงใน Cards ด้านบน)
        // เงื่อนไข: เป็นรายการ receive ที่ยังไม่มี prod_id ใน shelf_items (แปลว่ายังไม่มีที่ลง)
        const [pendingItems] = await pool.query(`
            SELECT st.trans_id, st.amount, st.date_time, p.prod_name, p.prod_img, p.description, p.prod_type
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            LEFT JOIN shelf_items si ON st.prod_id = si.prod_id
            WHERE st.type = 'receive' AND si.prod_id IS NULL
            ORDER BY st.date_time DESC
        `);

        const [employees] = await pool.query(
            "SELECT emp_id, emp_firstname, emp_lastname FROM employees WHERE available = 1"
        );

        res.render('goods_reception/receiving', { pendingItems, latestItems, employees });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

const addReceiving = async (req, res) => {
    // รับ emp_id มาจากฟอร์ม (req.body)
    const { prod_name, prod_code, brand, prod_type, amount, comp_name, emp_id } = req.body;
    const qty = parseInt(amount);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. ตรวจสอบ/เพิ่ม Product
        let [prods] = await conn.query("SELECT prod_id FROM products WHERE prod_code = ?", [prod_code]);
        let prod_id;
        if (prods.length === 0) {
            const [insP] = await conn.query(
                "INSERT INTO products (prod_code, prod_name, description, prod_type, brand, prod_img, size) VALUES (?, ?, ?, ?, ?, ?, 'M')",
                [prod_code, prod_name, brand, prod_type, brand, '/images/ram000.jpg']
            );
            prod_id = insP.insertId;
        } else {
            prod_id = prods[0].prod_id;
        }

        // 2. ตรวจสอบ/เพิ่ม Supplier
        let [sups] = await conn.query("SELECT sup_id FROM suppliers WHERE comp_name = ?", [comp_name]);
        let sup_id;
        if (sups.length === 0) {
            const [insS] = await conn.query("INSERT INTO suppliers (comp_name, comp_phone) VALUES (?, '000')", [comp_name]);
            sup_id = insS.insertId;
        } else {
            sup_id = sups[0].sup_id;
        }

        // 3. บันทึก Transition (ใช้ emp_id ที่ส่งมาจากฟอร์ม)
        await conn.query(
            "INSERT INTO stock_transition (type, sup_id, emp_id, prod_id, amount) VALUES ('IN', ?, ?, ?, ?)",
            [sup_id, emp_id, prod_id, qty]
        );

        // 4. เช็คคลัง (Shelf)
        const [shelf] = await conn.query(
            "SELECT shelf_id FROM shelf WHERE product_type = ? AND (capacity - amount) >= ? LIMIT 1",
            [prod_type, qty]
        );

        if (shelf.length > 0) {
            const shelf_id = shelf[0].shelf_id;
            await conn.query("UPDATE shelf SET amount = amount + ? WHERE shelf_id = ?", [qty, shelf_id]);
            await conn.query(
                "INSERT INTO shelf_items (shelf_id, prod_id, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?",
                [shelf_id, prod_id, qty, qty]
            );
            await conn.commit();
            res.json({ success: true, message: "รับเข้าคลังเรียบร้อย" });
        } else {
            await conn.commit();
            res.json({ success: true, message: "คลังเต็ม! สินค้าถูกพักไว้ที่ส่วนรอเข้าคลัง" });
        }
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        conn.release();
    }
};

module.exports = { getReceivingPage, addReceiving };