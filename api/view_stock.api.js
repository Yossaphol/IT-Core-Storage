const pool = require("../db");

const getAllStockByWHID = async (req, res) => {
  try {
	const wh_id_q = req.query.w;
		let wh_id = null;

		if (wh_id_q) {
			wh_id = Buffer.from(wh_id_q, 'base64').toString('utf-8');
		}
    const query = `
      select * from stocks where wh_id = ?
    `;
	const st_query = `select * from stock;`
	const [st_rows] = await pool.query(st_query)
		if (!wh_id && st_rows.length > 0) {
		 wh_id = st_rows[0].wh_id;
		}
    const [rows] = await pool.query(query, [wh_id]);
    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
	getAllStockByWHID
}