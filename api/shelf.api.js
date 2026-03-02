const pool = require('../db')

const getShelfByStockId = async(req, res)=>{
	try{
		const stock_id = req.params.id;
	
		const [rows] = await pool.query('select * from shelf where stock_id = ?', [stock_id])
		res.json(rows)
	}catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

const getAllProductInShelf = async(req, res)=>{
    try{
        const sh_id = req.params.id

        const [rows] = await pool.query(`
            SELECT 
                si.prod_id,
                si.amount,
                p.*,
                (SELECT MAX(date_time) FROM stock_transition st WHERE st.prod_id = si.prod_id) AS created_at
            FROM shelf_items si
            JOIN products p 
                ON si.prod_id = p.prod_id
            WHERE si.shelf_id = ?
        `, [sh_id])
        res.json(rows)
    }catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
	getShelfByStockId,
	getAllProductInShelf
}