const pool = require("../db");

const getIssuingPage = async (req, res) => {
    try {
        // 1. รายการล่าสุด (เบิกสำเร็จแล้ว: status = 'completed')
        const [latestItems] = await pool.query(`
            SELECT st.trans_id, st.amount, st.date_time, p.prod_name, p.prod_img, s.comp_name, e.emp_firstname, e.emp_lastname 
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            JOIN suppliers s ON st.sup_id = s.sup_id
            JOIN employees e ON st.emp_id = e.emp_id
            WHERE st.type = 'issue' AND st.status = 'completed'
            ORDER BY st.date_time DESC LIMIT 10
        `);

        // 2. รอยืนยันการเบิกจ่าย (ของไม่พอ: status = 'pending')
        const [pendingIssues] = await pool.query(`
            SELECT st.trans_id, st.amount, st.date_time, p.prod_name, p.prod_img, p.description, p.prod_type
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            WHERE st.type = 'issue' AND st.status = 'pending'
            ORDER BY st.date_time DESC
        `);

        // 3. ดึงรายชื่อพนักงาน
        const [employees] = await pool.query("SELECT emp_id, emp_firstname, emp_lastname FROM employees WHERE available = 1");

        res.render('goods_reception/issuing', { pendingIssues, latestItems, employees });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

const addIssuing = async (req, res) => {
    const { prod_code, amount, emp_id, comp_name } = req.body;
    const qty = parseInt(amount);
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. หาข้อมูลสินค้าและยอดรวมในคลัง
        const [product] = await conn.query("SELECT prod_id FROM products WHERE prod_code = ?", [prod_code]);
        if (product.length === 0) throw new Error("ไม่พบรหัสสินค้านี้");
        const prod_id = product[0].prod_id;

        const [stock] = await conn.query("SELECT SUM(amount) as total FROM shelf_items WHERE prod_id = ?", [prod_id]);
        const availableQty = stock[0].total || 0;

        // 2. ตรวจสอบผู้ขอเบิก (Supplier)
        let [sups] = await conn.query("SELECT sup_id FROM suppliers WHERE comp_name = ?", [comp_name]);
        let sup_id = sups.length > 0 ? sups[0].sup_id : (await conn.query("INSERT INTO suppliers (comp_name) VALUES (?)", [comp_name]))[0].insertId;

        if (availableQty >= qty) {
            // --- กรณีที่ 1: สินค้าพอ (Completed) ---
            // ตัดสต็อกแบบ FIFO (ตัดจาก Shelf ที่เก่าที่สุดก่อน)
            let remainingToIssue = qty;
            const [shelves] = await conn.query("SELECT shelf_id, amount FROM shelf_items WHERE prod_id = ? ORDER BY shelf_id ASC", [prod_id]);

            for (let s of shelves) {
                if (remainingToIssue <= 0) break;
                let take = Math.min(s.amount, remainingToIssue);
                
                await conn.query("UPDATE shelf_items SET amount = amount - ? WHERE shelf_id = ? AND prod_id = ?", [take, s.shelf_id, prod_id]);
                await conn.query("UPDATE shelf SET amount = amount - ? WHERE shelf_id = ?", [take, s.shelf_id]);
                
                remainingToIssue -= take;
            }
            // ลบรายการที่ amount เป็น 0 ออกจาก shelf_items
            await conn.query("DELETE FROM shelf_items WHERE amount <= 0");

            await conn.query(
                "INSERT INTO stock_transition (type, sup_id, emp_id, prod_id, amount, status) VALUES ('issue', ?, ?, ?, ?, 'completed')",
                [sup_id, emp_id, prod_id, qty]
            );
            await conn.commit();
            res.json({ success: true, message: "เบิกจ่ายสินค้าสำเร็จ" });

        } else {
            // --- กรณีที่ 2: สินค้าไม่พอ (Pending) ---
            await conn.query(
                "INSERT INTO stock_transition (type, sup_id, emp_id, prod_id, amount, status) VALUES ('issue', ?, ?, ?, ?, 'pending')",
                [sup_id, emp_id, prod_id, qty]
            );
            await conn.commit();
            res.json({ success: true, message: "สินค้าในคลังไม่พอ รายการถูกย้ายไปที่รอยืนยัน" });
        }
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        conn.release();
    }
};

module.exports = { getIssuingPage, addIssuing };