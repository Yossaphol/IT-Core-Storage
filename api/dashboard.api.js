const pool = require("../db");

exports.getDashboardData = async (req, res) => {
    try {
        const { start, end, search } = req.query;

        const buildDateCondition = (dateColumn) => {
            let conditions = [];
            let params = [];
            if (start && end) {
                conditions.push(`DATE(${dateColumn}) BETWEEN ? AND ?`);
                params.push(start, end);
            } else if (start) {
                conditions.push(`DATE(${dateColumn}) >= ?`);
                params.push(start);
            } else if (end) {
                conditions.push(`DATE(${dateColumn}) <= ?`);
                params.push(end);
            }
            return { conditions, params };
        };

        const [[totalProductsRow]] = await pool.query(
            `SELECT COUNT(*) as count FROM products`
        );

        const [[totalInStockRow]] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as sum FROM shelf_items`
        );

        const [[outOfStockRow]] = await pool.query(
            `SELECT COUNT(*) as count FROM products 
             WHERE prod_id NOT IN (SELECT DISTINCT prod_id FROM shelf_items WHERE amount > 0)`
        );

        const [typeDistRows] = await pool.query(`
            SELECT p.prod_type, COALESCE(SUM(si.amount), 0) as sum 
            FROM products p 
            LEFT JOIN shelf_items si ON p.prod_id = si.prod_id 
            GROUP BY p.prod_type
            ORDER BY sum DESC
            LIMIT 5
        `);

        const transInDate = buildDateCondition('date_time');
        const transInConditions = ["type = 'IN'", ...transInDate.conditions];
        const [[transInRow]] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as sum FROM stock_transition 
             WHERE ${transInConditions.join(' AND ')}`,
            transInDate.params
        );

        const transOutDate = buildDateCondition('date_time');
        const transOutConditions = ["type = 'issue'", ...transOutDate.conditions];
        const [[transOutRow]] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as sum FROM stock_transition 
             WHERE ${transOutConditions.join(' AND ')}`,
            transOutDate.params
        );

        const transAdjDate = buildDateCondition('date_time');
        const transAdjConditions = ["type = 'ADJUST'", ...transAdjDate.conditions];
        const [[transAdjRow]] = await pool.query(
            `SELECT COUNT(*) as count FROM stock_transition 
             WHERE ${transAdjConditions.join(' AND ')}`,
            transAdjDate.params
        );

        let monthlyWhereConditions = ["date_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)"];
        let monthlyParams = [];

        if (start && end) {
            monthlyWhereConditions = ["DATE(date_time) BETWEEN ? AND ?"];
            monthlyParams = [start, end];
        } else if (start) {
            monthlyWhereConditions = ["DATE(date_time) >= ?"];
            monthlyParams = [start];
        } else if (end) {
            monthlyWhereConditions = ["DATE(date_time) <= ?"];
            monthlyParams = [end];
        }

        const [monthlyTrans] = await pool.query(`
            SELECT MONTH(date_time) as month, YEAR(date_time) as year, type, SUM(amount) as sum
            FROM stock_transition
            WHERE ${monthlyWhereConditions.join(' AND ')}
            GROUP BY YEAR(date_time), MONTH(date_time), type
            ORDER BY year ASC, month ASC
        `, monthlyParams);

        const popDate = buildDateCondition('st.date_time');
        const popConditions = ["st.type = 'issue'", ...popDate.conditions];
        const [popularRows] = await pool.query(`
            SELECT p.prod_code, p.prod_name, p.brand, p.prod_type, p.prod_img, 
                   SUM(st.amount) as total_out
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            WHERE ${popConditions.join(' AND ')}
            GROUP BY p.prod_id, p.prod_code, p.prod_name, p.brand, p.prod_type, p.prod_img
            ORDER BY total_out DESC
            LIMIT 10
        `, popDate.params);

        let productConditions = [];
        let productParams = [];

        if (search) {
            productConditions.push(`(
                p.prod_name LIKE ? OR 
                p.prod_code LIKE ? OR 
                p.brand LIKE ? OR 
                p.prod_type LIKE ?
            )`);
            const searchPattern = `%${search}%`;
            productParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        const productWhere = productConditions.length > 0 
            ? `WHERE ${productConditions.join(' AND ')}` 
            : '';

        const [allProductsList] = await pool.query(`
            SELECT p.prod_code, p.prod_name, p.brand, p.prod_type, p.prod_img, 
                   COALESCE(SUM(si.amount), 0) as amount
            FROM products p
            LEFT JOIN shelf_items si ON p.prod_id = si.prod_id
            ${productWhere}
            GROUP BY p.prod_id, p.prod_code, p.prod_name, p.brand, p.prod_type, p.prod_img
            ORDER BY p.prod_name ASC
            LIMIT 100
        `, productParams);

        const topCatDate = buildDateCondition('st.date_time');
        const topCatConditions = ["st.type = 'issue'", ...topCatDate.conditions];
        const [topCategoriesOut] = await pool.query(`
            SELECT p.prod_type, SUM(st.amount) as total_out
            FROM stock_transition st
            JOIN products p ON st.prod_id = p.prod_id
            WHERE ${topCatConditions.join(' AND ')}
            GROUP BY p.prod_type
            ORDER BY total_out DESC
            LIMIT 6
        `, topCatDate.params);

        const [warehouseList] = await pool.query(`
            SELECT 
                w.wh_id, 
                w.wh_name, 
                w.capacity as max_capacity, 
                COALESCE(SUM(si.amount), 0) as current_stock
            FROM warehouse w
            LEFT JOIN stock st ON w.wh_id = st.wh_id
            LEFT JOIN shelf sh ON st.stock_id = sh.stock_id
            LEFT JOIN shelf_items si ON sh.shelf_id = si.shelf_id
            GROUP BY w.wh_id, w.wh_name, w.capacity
        `);

        const totalCapacity = warehouseList.reduce(
            (sum, wh) => sum + (Number(wh.max_capacity) || 0), 0
        );

        res.render('dashboard_management/dashboard', {
            totalProducts: totalProductsRow.count || 0,
            totalInStock: totalInStockRow.sum || 0,
            outOfStock: outOfStockRow.count || 0,
            totalCapacity: totalCapacity,
            typeDist: typeDistRows,
            transIn: transInRow.sum || 0,
            transOut: transOutRow.sum || 0,
            transAdj: transAdjRow.count || 0,
            monthlyTrans: monthlyTrans,
            popularProducts: popularRows,
            allProducts: allProductsList,
            topCategoriesOut: topCategoriesOut,
            warehouses: warehouseList,
            query: req.query
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send("Server Error");
    }
};
