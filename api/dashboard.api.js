const pool = require("../db");

exports.getDashboardData = async (req, res) => {
    try {
        const [[totalProductsRow]] = await pool.query(`SELECT COUNT(*) as count FROM products`);
        const [[totalInStockRow]] = await pool.query(`SELECT SUM(amount) as sum FROM shelf_items`);
        const [[outOfStockRow]] = await pool.query(`SELECT COUNT(*) as count FROM products WHERE prod_id NOT IN (SELECT DISTINCT prod_id FROM shelf_items WHERE amount > 0)`);

        const [typeDistRows] = await pool.query(`
            SELECT p.prod_type, IFNULL(SUM(si.amount), 0) as sum 
            FROM products p 
            LEFT JOIN shelf_items si ON p.prod_id = si.prod_id 
            GROUP BY p.prod_type
            ORDER BY sum DESC
            LIMIT 5
        `);

        const [[transInRow]] = await pool.query(`SELECT SUM(amount) as sum FROM stock_transition WHERE type = 'IN'`);
        const [[transOutRow]] = await pool.query(`SELECT SUM(amount) as sum FROM stock_transition WHERE type = 'OUT'`);
        const [[transAdjRow]] = await pool.query(`SELECT COUNT(*) as count FROM stock_transition WHERE type = 'ADJUST'`);

        const [monthlyTrans] = await pool.query(`
            SELECT MONTH(date_time) as month, type, SUM(amount) as sum
            FROM stock_transition
            WHERE date_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY MONTH(date_time), type
            ORDER BY month ASC
        `);

        const [popularRows] = await pool.query(`
            SELECT p.prod_code, p.prod_name, p.brand, p.prod_type, p.prod_img, SUM(st.amount) as total_out
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            WHERE st.type = 'OUT'
            GROUP BY p.prod_id
            ORDER BY total_out DESC
            LIMIT 10
        `);

        const [allProductsList] = await pool.query(`
            SELECT p.prod_code, p.prod_name, p.brand, p.prod_type, p.prod_img, IFNULL(SUM(si.amount), 0) as amount
            FROM products p
            LEFT JOIN shelf_items si ON p.prod_id = si.prod_id
            GROUP BY p.prod_id
            LIMIT 100
        `);

        const [topCategoriesOut] = await pool.query(`
            SELECT p.prod_type, SUM(st.amount) as total_out
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            WHERE st.type = 'OUT'
            GROUP BY p.prod_type
            ORDER BY total_out DESC
            LIMIT 6
        `);

        res.render('dashboard_management/dashboard', {
            totalProducts: totalProductsRow.count || 0,
            totalInStock: totalInStockRow.sum || 0,
            outOfStock: outOfStockRow.count || 0,
            typeDist: typeDistRows,
            transIn: transInRow.sum || 0,
            transOut: transOutRow.sum || 0,
            transAdj: transAdjRow.count || 0,
            monthlyTrans: monthlyTrans,
            popularProducts: popularRows,
            allProducts: allProductsList,
            topCategoriesOut: topCategoriesOut
        });

    } catch (error) {
        res.status(500).send("Server Error");
    }
};