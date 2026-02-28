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
          e.emp_firstname,
          e.emp_lastname,
          w.address,
          w.capacity;
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
    const { stock_name, capacity } = req.body;

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
  try {
    const { stock_name, capacity, wh_id } = req.body;

    const [result] = await pool.query(
      `INSERT INTO stock (stock_name, capacity, wh_id) VALUES (?, ?, ?)`,
      [stock_name, capacity, wh_id]
    );

    const [rows] = await pool.query(
      `SELECT * FROM stock WHERE stock_id = ?`,
      [result.insertId]
    );

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteStock = async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = `
      SELECT COALESCE(SUM(si.amount),0) AS current_amount
      FROM stock s
      LEFT JOIN shelf sh ON sh.stock_id = s.stock_id
      LEFT JOIN shelf_items si ON si.shelf_id = sh.shelf_id
      WHERE s.stock_id = ?
      GROUP BY s.stock_id;
    `;

    const [checkResult] = await pool.query(checkQuery, [id]);

    if (
      checkResult.length > 0 &&
      parseInt(checkResult[0].current_amount) > 0
    ) {
      return res.status(400).json({ message: "Stock is not empty" });
    }

    const [result] = await pool.query(
      `DELETE FROM stock WHERE stock_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Stock not found" });
    }

    res.json({ success: true });

  } catch (err) {
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
  deleteStock
};