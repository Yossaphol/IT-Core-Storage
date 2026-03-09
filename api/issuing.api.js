const pool = require("../db");

const getIssuingPage = async (req, res) => {
    const conn = await pool.getConnection();

    try {

        // auto clear pending issue
        try {
            await conn.beginTransaction();
            await autoIssuePending(conn);
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        }

        // 1. รายการล่าสุด
        const [latestItems] = await conn.query(`
            SELECT st.trans_id, st.amount, st.date_time, 
                   p.prod_name, p.prod_img, 
                   s.comp_name, 
                   e.emp_firstname, e.emp_lastname 
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            JOIN suppliers s ON st.sup_id = s.sup_id
            JOIN employees e ON st.emp_id = e.emp_id
            WHERE st.type = 'issue'
            AND st.status = 'completed'
            ORDER BY st.date_time DESC
            LIMIT 10
        `);

        // 2. pending issue
        const [pendingIssues] = await conn.query(`
            SELECT st.trans_id, st.amount, st.date_time,
                   p.prod_name, p.prod_img, p.description, p.prod_type
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            WHERE st.type = 'issue'
            AND st.status = 'pending'
            ORDER BY st.date_time DESC
        `);

        // 3. employees
        const [employees] = await conn.query(`
            SELECT emp_id, emp_firstname, emp_lastname
            FROM employees
            WHERE available = 1
        `);

        res.render('goods_reception/issuing', {
            pendingIssues,
            latestItems,
            employees
        });

    } catch (err) {

        console.error(err);
        res.status(500).send("Server Error");

    } finally {

        conn.release();

    }
};

const addIssuing = async (req, res) => {
    const { prod_code, amount, emp_id, comp_name } = req.body;
    const qty = parseInt(amount);
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // หา product
        const [product] = await conn.query(
            "SELECT prod_id FROM products WHERE prod_code = ?",
            [prod_code]
        );

        if (product.length === 0) throw new Error("ไม่พบรหัสสินค้า");

        const prod_id = product[0].prod_id;

        // SUM จำนวนสินค้าจาก shelf_items
        const [stock] = await conn.query(
            "SELECT SUM(amount) AS total FROM shelf_items WHERE prod_id = ?",
            [prod_id]
        );

        const availableQty = stock[0].total || 0;

        // หา supplier
        let [sups] = await conn.query(
            "SELECT sup_id FROM suppliers WHERE comp_name = ?",
            [comp_name]
        );

        let sup_id;

        if (sups.length > 0) {
            sup_id = sups[0].sup_id;
        } else {
            const [newSup] = await conn.query(
                "INSERT INTO suppliers (comp_name, comp_phone) VALUES (?, '-')",
                [comp_name]
            );
            sup_id = newSup.insertId;
        }

        // ====== สินค้าพอ ======
        if (availableQty >= qty) {

            let remaining = qty;

            // เอา shelf ที่มีสินค้านี้
            const [shelves] = await conn.query(`
                SELECT shelf_id, amount
                FROM shelf_items
                WHERE prod_id = ?
                ORDER BY shelf_id ASC
            `, [prod_id]);

            for (let s of shelves) {

                if (remaining <= 0) break;

                const take = Math.min(s.amount, remaining);

                // ลด shelf_items
                await conn.query(`
                    UPDATE shelf_items
                    SET amount = amount - ?
                    WHERE shelf_id = ? AND prod_id = ?
                `, [take, s.shelf_id, prod_id]);

                // ลด shelf.amount
                await conn.query(`
                    UPDATE shelf
                    SET amount = amount - ?
                    WHERE shelf_id = ?
                `, [take, s.shelf_id]);

                remaining -= take;
            }

            // ลบ record ที่หมด
            await conn.query(`
                DELETE FROM shelf_items
                WHERE amount <= 0
            `);

            // บันทึก transition
            await conn.query(`
                INSERT INTO stock_transition
                (type, sup_id, emp_id, prod_id, amount, remaining, status)
                VALUES ('issue', ?, ?, ?, ?, 0, 'completed')
            `, [sup_id, emp_id, prod_id, qty]);

            await conn.commit();

            res.json({
                success: true,
                message: "เบิกจ่ายสินค้าสำเร็จ"
            });

        } 
        // ====== สินค้าไม่พอ ======
        else {

            await conn.query(`
                INSERT INTO stock_transition
                (type, sup_id, emp_id, prod_id, amount, remaining, status)
                VALUES ('issue', ?, ?, ?, ?, ?, 'pending')
            `, [sup_id, emp_id, prod_id, qty, qty]);

            await conn.commit();

            res.json({
                success: true,
                message: "สินค้าไม่พอ ระบบย้ายไป Pending"
            });
        }

    } catch (err) {

        await conn.rollback();

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {
        conn.release();
    }
};

const autoIssuePending = async (conn) => {

    const [pendings] = await conn.query(`
        SELECT trans_id, prod_id, remaining
        FROM stock_transition
        WHERE type = 'issue'
        AND status = 'pending'
        ORDER BY date_time ASC
    `);

    for (const item of pendings) {

        const { trans_id, prod_id, remaining } = item;

        const [stock] = await conn.query(`
            SELECT SUM(amount) AS total
            FROM shelf_items
            WHERE prod_id = ?
        `, [prod_id]);

        const available = stock[0].total || 0;

        if (available < remaining) continue;

        let remainingToTake = remaining;

        const [shelves] = await conn.query(`
            SELECT shelf_id, amount
            FROM shelf_items
            WHERE prod_id = ?
            ORDER BY shelf_id ASC
        `, [prod_id]);

        for (const s of shelves) {

            if (remainingToTake <= 0) break;

            const take = Math.min(s.amount, remainingToTake);

            await conn.query(`
                UPDATE shelf_items
                SET amount = amount - ?
                WHERE shelf_id = ? AND prod_id = ?
            `, [take, s.shelf_id, prod_id]);

            await conn.query(`
                UPDATE shelf
                SET amount = amount - ?
                WHERE shelf_id = ?
            `, [take, s.shelf_id]);

            remainingToTake -= take;
        }

        await conn.query(`
            DELETE FROM shelf_items
            WHERE prod_id = ? AND amount <= 0
        `, [prod_id]);

        await conn.query(`
            UPDATE stock_transition
            SET status = 'completed',
                remaining = 0
            WHERE trans_id = ?
        `, [trans_id]);

    }
};

module.exports = { getIssuingPage, addIssuing };