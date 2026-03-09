const pool = require("../db");

const adjustProductAmount = async (req, res) => {

    const { shelf_id, prod_id, new_amount } = req.body;
    const emp_id = req.session.user.emp_id;

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        // update shelf_items
        await conn.query(
            `UPDATE shelf_items
             SET amount = ?
             WHERE shelf_id = ? AND prod_id = ?`,
            [new_amount, shelf_id, prod_id]
        );

        // หา supplier จาก transaction ล่าสุดที่รับเข้า
        const [supRow] = await conn.query(
            `SELECT sup_id
             FROM stock_transition
             WHERE prod_id = ? AND type = 'IN'
             ORDER BY trans_id DESC
             LIMIT 1`,
            [prod_id]
        );

        const sup_id = supRow.length ? supRow[0].sup_id : null;

        // insert transition ใหม่
        await conn.query(
            `INSERT INTO stock_transition
            (type, sup_id, emp_id, prod_id, amount, status, date_time, remaining)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
            [
                "ADJUSTMENT",
                sup_id,
                emp_id,
                prod_id,
                new_amount,
                "completed",
                0
            ]
        );

        await conn.commit();

        res.json({ success: true });

    } catch (err) {

        await conn.rollback();
        console.error(err);
        res.status(500).json({ message: "Adjustment failed" });

    } finally {

        conn.release();

    }

};

module.exports = {
    adjustProductAmount
};