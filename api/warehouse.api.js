const pool = require("../db");

const getAllWarehouses = async (req, res) => {
  try {
    const query = `
      SELECT wh_id, wh_name
      FROM warehouse
      ORDER BY wh_id;
    `;

    const [rows] = await pool.query(query);
    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
          w.wh_id,
          w.wh_name,
          CONCAT(e.emp_firstname, ' ', e.emp_lastname) AS manager_name,
          w.address AS location,

          w.capacity,

          COALESCE(SUM(si.amount), 0) AS current

      FROM warehouse w
      LEFT JOIN employees e ON w.wh_manager_id = e.emp_id
      LEFT JOIN stock st ON st.wh_id = w.wh_id
      LEFT JOIN shelf sh ON sh.stock_id = st.stock_id
      LEFT JOIN shelf_items si ON si.shelf_id = sh.shelf_id
      WHERE w.wh_id = ?
      GROUP BY 
          w.wh_id,
          w.wh_name,
          w.capacity,
          e.emp_firstname,
          e.emp_lastname,
          w.address;
    `;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const addWarehouse = async (req, res) => {
  try {
    const { wh_name, capacity, username, address } = req.body;

    if (!wh_name || !capacity || !username) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const findManagerQuery = `
      SELECT emp_id 
      FROM employees 
      WHERE username = ?;
    `;

    const [managerResult] = await pool.query(findManagerQuery, [username]);

    if (managerResult.length === 0) {
      return res.status(400).json({ message: "Manager not found" });
    }

    const managerId = managerResult[0].emp_id;

    const insertQuery = `
      INSERT INTO warehouse 
      (wh_name, capacity, wh_manager_id, address)
      VALUES (?, ?, ?, ?);
    `;

    const values = [wh_name, capacity, managerId, address];

    const [result] = await pool.query(insertQuery, values);

    const [rows] = await pool.query(
      `SELECT * FROM warehouse WHERE wh_id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = `
      SELECT COALESCE(SUM(si.amount),0) AS current_amount
      FROM stock s
      LEFT JOIN shelf sh ON sh.stock_id = s.stock_id
      LEFT JOIN shelf_items si ON si.shelf_id = sh.shelf_id
      WHERE s.wh_id = ?;
    `;

    const [checkResult] = await pool.query(checkQuery, [id]);

    if (parseInt(checkResult[0].current_amount) > 0) {
      return res.status(400).json({ message: "Warehouse is not empty" });
    }

    const [result] = await pool.query(
      `DELETE FROM warehouse WHERE wh_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getStocksByWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
          s.stock_id,
          s.stock_name,
          s.wh_id,
          s.capacity,
          COALESCE(SUM(si.amount),0) AS current_amount
      FROM stock s
      LEFT JOIN shelf sh ON sh.stock_id = s.stock_id
      LEFT JOIN shelf_items si ON si.shelf_id = sh.shelf_id
      WHERE s.wh_id = ?
      GROUP BY s.stock_id
      ORDER BY s.stock_id;
    `;

    const [rows] = await pool.query(query, [id]);
    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_name, capacity, product_type } = req.body;

    const [result] = await pool.query(
      `UPDATE stock
       SET stock_name = ?,
           capacity = ?
       WHERE stock_id = ?`,
      [stock_name, capacity, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Stock not found" });
    }

    // ถ้ามีการส่ง product_type มา ให้ update shelf ด้วย
    if (product_type) {
      await pool.query(
        `UPDATE shelf
         SET product_type = ?
         WHERE stock_id = ?`,
        [product_type, id]
      );
    }

    const [rows] = await pool.query(
      `SELECT * FROM stock WHERE stock_id = ?`,
      [id]
    );

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const createStock = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    let { stock_name, capacity, wh_id, product_type } = req.body;

    const stockCapacity = Number(capacity);

    if (!stock_name || !stockCapacity || !wh_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await conn.beginTransaction();

    // หา capacity ของ warehouse
    const [warehouse] = await conn.query(
      `SELECT capacity FROM warehouse WHERE wh_id = ?`,
      [wh_id]
    );

    if (warehouse.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const warehouseCapacity = Number(warehouse[0].capacity);

    // หา capacity ที่ใช้ไปแล้ว
    const [used] = await conn.query(
      `SELECT COALESCE(SUM(capacity),0) AS used_capacity
       FROM stock
       WHERE wh_id = ?`,
      [wh_id]
    );

    const usedCapacity = Number(used[0].used_capacity);

    // เช็คความจุรวม
    if (usedCapacity + stockCapacity > warehouseCapacity) {
      await conn.rollback();
      return res.status(400).json({
        message: "ความจุของโซนเก็บสินค้าต้องไม่เกินความจุคลังสินค้า"
      });
    }

    // เพิ่ม stock
    const [result] = await conn.query(
      `INSERT INTO stock (stock_name, capacity, wh_id) VALUES (?, ?, ?)`,
      [stock_name, stockCapacity, wh_id]
    );

    const stockId = result.insertId;

    // สร้าง shelf อัตโนมัติ (ช่องละ 10)
    let remaining = stockCapacity;

    while (remaining > 0) {

      const shelfCapacity = remaining >= 10 ? 10 : remaining;

      await conn.query(
        `INSERT INTO shelf (stock_id, capacity, amount, product_type)
         VALUES (?, ?, ?, ?)`,
        [stockId, shelfCapacity, 0, product_type]
      );

      remaining -= shelfCapacity;
    }

    await conn.commit();

    const [rows] = await conn.query(
      `SELECT * FROM stock WHERE stock_id = ?`,
      [stockId]
    );

    res.json(rows[0]);

  } catch (err) {

    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Server error" });

  } finally {
    conn.release();
  }
};

const deleteStock = async (req, res) => {
  const conn = await pool.getConnection();

  try {

    const { id } = req.params;

    await conn.beginTransaction();

    const [checkResult] = await conn.query(
      `SELECT COALESCE(SUM(si.amount),0) AS current_amount
       FROM shelf_items si
       JOIN shelf sh ON si.shelf_id = sh.shelf_id
       WHERE sh.stock_id = ?`,
      [id]
    );

    if (checkResult[0].current_amount > 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Stock is not empty" });
    }

    await conn.query(
      `DELETE si
       FROM shelf_items si
       JOIN shelf sh ON si.shelf_id = sh.shelf_id
       WHERE sh.stock_id = ?`,
      [id]
    );

    await conn.query(
      `DELETE FROM shelf WHERE stock_id = ?`,
      [id]
    );

    const [result] = await conn.query(
      `DELETE FROM stock WHERE stock_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Stock not found" });
    }

    await conn.commit();

    res.json({ success: true });

  } catch (err) {

    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Server error" });

  } finally {
    conn.release();
  }
};

const getManagers = async (req, res) => {
  try {
    const query = `
      SELECT emp_id, username, emp_firstname, emp_lastname
      FROM employees
      WHERE emp_role = 'MANAGER' and available = 1
      ORDER BY emp_firstname;
    `;

    const [rows] = await pool.query(query);
    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getProductTypes = async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT DISTINCT prod_type
      FROM products
      ORDER BY prod_type
    `);

    res.json(rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }
};

module.exports = {
  getAllWarehouses,
  getWarehouseById,
  addWarehouse,
  deleteWarehouse,
  getStocksByWarehouse,
  updateStock,
  createStock,
  deleteStock,
  getManagers,
  getProductTypes
};