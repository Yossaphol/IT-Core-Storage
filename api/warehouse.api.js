const pool = require("../db");

const getAllWarehouses = async (req, res) => {
  try {
    const query = `
      SELECT wh_id, wh_name
      FROM warehouse
      ORDER BY wh_id;
    `;

    const { rows } = await pool.query(query);
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
          e.emp_firstname || ' ' || e.emp_lastname AS manager_name,
          w.address AS location,
          w.capacity,
          COALESCE(SUM(si.amount), 0) AS current
      FROM warehouse w
      LEFT JOIN employees e ON w.wh_manager_id = e.emp_id
      LEFT JOIN stock st ON st.wh_id = w.wh_id
      LEFT JOIN shelf sh ON sh.stock_id = st.stock_id
      LEFT JOIN shelf_items si ON si.shelf_id = sh.shelf_id
      WHERE w.wh_id = $1
      GROUP BY 
          w.wh_id,
          w.wh_name,
          e.emp_firstname,
          e.emp_lastname,
          w.address,
          w.capacity;
    `;

    const { rows } = await pool.query(query, [id]);

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
      WHERE username = $1;
    `;

    const managerResult = await pool.query(findManagerQuery, [username]);

    if (managerResult.rows.length === 0) {
      console.log('manager not found');
      return res.status(400).json({ message: "Manager not found" });
    }

    const managerId = managerResult.rows[0].emp_id;

    const insertQuery = `
      INSERT INTO warehouse 
      (wh_name, capacity, wh_manager_id, address)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [wh_name, capacity, managerId, address];

    const { rows } = await pool.query(insertQuery, values);

    res.status(201).json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM warehouse
      WHERE wh_id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    res.json({ message: "Warehouse deleted successfully", deleted: rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getStocksByWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT stock_id, stock_name
      FROM stock
      WHERE wh_id = $1
      ORDER BY stock_id;
    `;

    const { rows } = await pool.query(query, [id]);
    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllWarehouses,
  getWarehouseById,
  addWarehouse,
  deleteWarehouse,
  getStocksByWarehouse
};