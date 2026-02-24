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

module.exports = {
  getAllWarehouses,
  getWarehouseById
};