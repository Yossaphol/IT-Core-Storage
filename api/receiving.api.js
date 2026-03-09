const pool = require("../db");

const getReceivingPage = async (req, res) => {
    try {

        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();
            await autoPutawayPending(conn);
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        const [latestItems] = await pool.query(`
            SELECT st.trans_id, st.amount, st.date_time,
                   p.prod_name, p.prod_img,
                   s.comp_name,
                   e.emp_firstname, e.emp_lastname
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            JOIN suppliers s ON st.sup_id = s.sup_id
            JOIN employees e ON st.emp_id = e.emp_id
            WHERE st.type = 'IN'
            AND st.status = 'completed'
            ORDER BY st.date_time DESC
            LIMIT 10
        `);

        const [pendingItems] = await pool.query(`
            SELECT st.trans_id, st.remaining AS amount, st.date_time,
                   p.prod_name, p.prod_img,
                   p.description, p.prod_type
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            WHERE st.type = 'IN'
            AND st.status = 'pending'
            AND st.remaining > 0
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

    const { prod_name, prod_code, brand, prod_type, amount, comp_name, emp_id } = req.body;
    const qty = parseInt(amount);

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        let [prods] = await conn.query(
            "SELECT prod_id FROM products WHERE prod_code = ?",
            [prod_code]
        );

        let prod_id;

        if (prods.length === 0) {

            const [insP] = await conn.query(
                `INSERT INTO products
                (prod_code, prod_name, description, prod_type, brand, prod_img)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [prod_code, prod_name, brand, prod_type, brand, '/images/ram000.jpg']
            );

            prod_id = insP.insertId;

        } else {

            prod_id = prods[0].prod_id;

        }

        let [sups] = await conn.query(
            "SELECT sup_id FROM suppliers WHERE comp_name = ?",
            [comp_name]
        );

        let sup_id;

        if (sups.length === 0) {

            const [insS] = await conn.query(
                "INSERT INTO suppliers (comp_name, comp_phone) VALUES (?, '000')",
                [comp_name]
            );

            sup_id = insS.insertId;

        } else {

            sup_id = sups[0].sup_id;

        }

        const [trans] = await conn.query(
            `INSERT INTO stock_transition
            (type, sup_id, emp_id, prod_id, amount, remaining, status)
            VALUES ('IN', ?, ?, ?, ?, ?, 'pending')`,
            [sup_id, emp_id, prod_id, qty, qty]
        );

        const trans_id = trans.insertId;

        const [[productType]] = await conn.query(
        "SELECT prod_type FROM products WHERE prod_id=?",
        [prod_id]
        );

        const [shelves] = await conn.query(`
        SELECT shelf_id, capacity, amount
        FROM shelf
        WHERE product_type = ?
        AND capacity > amount
        ORDER BY (capacity - amount) DESC
        FOR UPDATE
        `, [productType.prod_type]);

        let remaining = qty;

        for (const s of shelves) {

            if (remaining <= 0) break;

            const free = s.capacity - s.amount;

            if (free <= 0) continue;

            const putAmount = Math.min(free, remaining);

            await conn.query(
                "UPDATE shelf SET amount = amount + ? WHERE shelf_id = ?",
                [putAmount, s.shelf_id]
            );

            await conn.query(
                `INSERT INTO shelf_items (shelf_id, prod_id, amount)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE amount = amount + ?`,
                [s.shelf_id, prod_id, putAmount, putAmount]
            );

            remaining -= putAmount;
        }

        await conn.query(
            "UPDATE stock_transition SET remaining=? WHERE trans_id=?",
            [remaining, trans_id]
        );

        if (remaining === 0) {

            await conn.query(
                "UPDATE stock_transition SET status='completed' WHERE trans_id=?",
                [trans_id]
            );

        }

        await conn.commit();

        if (remaining > 0) {

            res.json({
                success: true,
                message: `พื้นที่ shelf ไม่พอ เหลือ ${remaining} ชิ้น รอเข้าคลัง`
            });

        } else {

            res.json({
                success: true,
                message: "รับเข้าคลังเรียบร้อย"
            });

        }

    } catch (err) {

        await conn.rollback();
        res.status(500).json({ success: false, error: err.message });

    } finally {

        conn.release();

    }
};


async function autoPutawayPending(conn) {

    const [pendings] = await conn.query(`
        SELECT trans_id, prod_id, remaining
        FROM stock_transition
        WHERE type='IN' AND status='pending' AND remaining > 0
        ORDER BY date_time
    `);

    for (const item of pendings) {

        let remaining = item.remaining;

        const [[product]] = await conn.query(
            "SELECT prod_type FROM products WHERE prod_id=?",
            [item.prod_id]
        );

        if (!product) continue;

        const [shelves] = await conn.query(`
            SELECT shelf_id, capacity, amount
            FROM shelf
            WHERE product_type = ?
            AND capacity > amount
            ORDER BY (capacity - amount) DESC
            FOR UPDATE
        `, [product.prod_type]);

        for (const s of shelves) {

            if (remaining <= 0) break;

            const free = s.capacity - s.amount;

            if (free <= 0) continue;

            const putAmount = Math.min(free, remaining);

            await conn.query(
                "UPDATE shelf SET amount = amount + ? WHERE shelf_id = ?",
                [putAmount, s.shelf_id]
            );

            await conn.query(
                `INSERT INTO shelf_items (shelf_id, prod_id, amount)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE amount = amount + ?`,
                [s.shelf_id, item.prod_id, putAmount, putAmount]
            );

            remaining -= putAmount;
        }

        await conn.query(
            "UPDATE stock_transition SET remaining=? WHERE trans_id=?",
            [remaining, item.trans_id]
        );

        if (remaining === 0) {

            await conn.query(
                "UPDATE stock_transition SET status='completed' WHERE trans_id=?",
                [item.trans_id]
            );

        }
    }
}

module.exports = { getReceivingPage, addReceiving, autoPutawayPending };