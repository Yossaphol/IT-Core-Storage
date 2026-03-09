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
                url: `/transactions` //ใช้อันนี้ก่อน ค่อยเพิ่ม param
            }));
        } else if (role === 'MANAGER') {
			const productQuery = `
                SELECT DISTINCT p.prod_id, p.prod_name, p.prod_code, st.type
                FROM products p
                JOIN stock_transition st ON p.prod_id = st.prod_id
                WHERE p.prod_id LIKE ? OR p.prod_name LIKE ?
                LIMIT 5
            `;

            const warehouseQuery = `
                SELECT w.wh_id, w.wh_name, e.emp_firstname, e.emp_lastname
                FROM warehouse w
                LEFT JOIN employees e ON w.wh_manager_id = e.emp_id
                WHERE w.wh_id LIKE ? OR w.wh_name LIKE ?
                LIMIT 5
            `;

			const [productResult, warehouseResult] = await Promise.all([
                pool.query(productQuery, [`%${query}%`, `%${query}%`]),
                pool.query(warehouseQuery, [`%${query}%`, `%${query}%`])
            ]);

			const productRows = productResult[0];
            const warehouseRows = warehouseResult[0];
            
			const mappedWarehouses = warehouseRows.map(item => ({
                searchType: 'wh',
                title: item.wh_name,
                subtitle: `${item.wh_id}`,
				wh_manager: `${item.emp_firstname} ${item.emp_lastname}`,
                url: `/warehouse_management/edit?wh_id=${item.wh_id}` //พาไปหน้าจัดการคลัง
            }));

			const mappedProducts = productRows.map(item => ({
                searchType: 'product',
                title: item.prod_name,
                subtitle: item.prod_code,
                type: item.type,
                url: `/transactions` //ใช้อันนี้ก่อน
            }));

            results = [...mappedWarehouses, ...mappedProducts];
        } else if (role === 'SYSTEM')
		{
			const productQuery = `
                SELECT DISTINCT p.prod_id, p.prod_name, p.prod_code, st.type
                FROM products p
                JOIN stock_transition st ON p.prod_id = st.prod_id
                WHERE p.prod_id LIKE ? OR p.prod_name LIKE ?
                LIMIT 5
            `;

            const userQuery = `
                SELECT *
                FROM employees
                WHERE emp_id LIKE ? OR username LIKE ? or emp_firstname like ? or emp_lastname like ?
                LIMIT 5
            `;

            const supplierQuery = `
                SELECT sup_id, comp_name
                FROM suppliers
                WHERE sup_id LIKE ? OR comp_name LIKE ?
                LIMIT 5
            `;


            const [productResult, userResult, supplierResult] = await Promise.all([
                pool.query(productQuery, [`%${query}%`, `%${query}%`]),
                pool.query(userQuery, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]),
                pool.query(supplierQuery, [`%${query}%`, `%${query}%`])
            ]);

            const mappedUsers = userResult[0].map(item => ({
                searchType: 'user',
                title: item.username,
                id: `${item.emp_id}`,
                fullName: `${item.emp_firstname} ${item.emp_lastname}`,
                role: item.emp_role,
				img_url: item.emp_img,
                url: `/user_management` 
            }));

            const mappedSuppliers = supplierResult[0].map(item => ({
                searchType: 'supplier',
                title: item.comp_name,
                subtitle: item.sup_id,
                url: `/supplier_management`
            }));

            const mappedProducts = productResult[0].map(item => ({
                searchType: 'product',
                title: item.prod_name,
                subtitle: item.prod_code,
                type: item.type,
                url: `/product_management`
            }));

            results = [...mappedUsers, ...mappedSuppliers, ...mappedProducts];
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