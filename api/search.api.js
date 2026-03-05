const pool = require("../db")


const search_query  = async (req, res) => {
    try {
		
		if (!req.session.user) {
    		return res.status(401).json({ error: "Unauthorized" });
		}
        const query = req.query.q;
        const role = req.session.user.role;
        let results = [];

        if (role === 'WAREHOUSE') {
            const searchQuery = `
                SELECT DISTINCT p.prod_id, p.prod_name, p.prod_code, st.type
                FROM products p
                JOIN stock_transition st ON p.prod_id = st.prod_id
                WHERE p.prod_id LIKE ? OR p.prod_name LIKE ?
                LIMIT 10
            `;
            const [rows] = await pool.query(searchQuery, [`%${query}%`, `%${query}%`]);
            
            results = rows.map(item => ({
                title: item.prod_name,
                subtitle: item.prod_code,
				type: item.type,
                url: `/transactions` // ใช้อันนี้ก่อน ค่อยเพิ่ม param
            }));
        } else if (role === 'MANAGER') {
            results = [
                { title: `คลังสินค้า: ${query}`, subtitle: "สาขาหลัก", url: `/warehouse/1` }
            ];
        } else if (role === 'SYSTEM')
		{
			results = [
                { title: `สินค้า: ${query}`, subtitle: "รหัส SKU: 12345", url: `/items/12345` }
            ];
		}
        res.json(results);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};


module.exports = {
	search_query
}