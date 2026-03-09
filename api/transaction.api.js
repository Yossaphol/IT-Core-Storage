const pool = require("../db");

exports.getTransactions = async (req, res) => {
    try {
        const { start, end, search } = req.query;

        const buildConditions = (type) => {
            let conditions = ["st.type = ?"];
            let params = [type];

            if (start && end) {
                conditions.push("DATE(st.date_time) BETWEEN ? AND ?");
                params.push(start, end);
            } else if (start) {
                conditions.push("DATE(st.date_time) >= ?");
                params.push(start);
            } else if (end) {
                conditions.push("DATE(st.date_time) <= ?");
                params.push(end);
            }

            if (search) {
                conditions.push(`(
                    p.prod_name LIKE ? OR 
                    p.prod_code LIKE ? OR 
                    s.comp_name LIKE ? OR 
                    e.emp_firstname LIKE ? OR 
                    e.emp_lastname LIKE ?
                )`);
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
            }

            return {
                whereStr: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
                paramsArr: params,
            };
        };

        const inCondition = buildConditions("IN");
        const [inboundData] = await pool.query(`
            SELECT st.trans_id, p.prod_img, p.prod_name, p.brand, p.prod_code, p.prod_type, 
                   st.date_time, st.amount, s.comp_name AS sender, e.emp_firstname, e.emp_lastname
            FROM stock_transition st
            LEFT JOIN products p ON st.prod_id = p.prod_id
            LEFT JOIN suppliers s ON st.sup_id = s.sup_id
            LEFT JOIN employees e ON st.emp_id = e.emp_id
            ${inCondition.whereStr}
            ORDER BY st.date_time DESC
        `, inCondition.paramsArr);

        const outCondition = buildConditions("issue");
        const [outboundData] = await pool.query(`
            SELECT st.trans_id, p.prod_img, p.prod_name, p.brand, p.prod_code, p.prod_type, 
                   st.date_time, st.amount, s.comp_name AS requester, e.emp_firstname, e.emp_lastname
            FROM stock_transition st
            LEFT JOIN products p ON st.prod_id = p.prod_id
            LEFT JOIN suppliers s ON st.sup_id = s.sup_id
            LEFT JOIN employees e ON st.emp_id = e.emp_id
            ${outCondition.whereStr}
            ORDER BY st.date_time DESC
        `, outCondition.paramsArr);

        const adjustCondition = buildConditions("ADJUST");
        const [adjustData] = await pool.query(`
            SELECT st.trans_id, p.prod_img, p.prod_name, p.brand, p.prod_code, p.prod_type, 
                   st.date_time, st.amount, e.emp_firstname, e.emp_lastname
            FROM stock_transition st
            LEFT JOIN products p ON st.prod_id = p.prod_id
            LEFT JOIN suppliers s ON st.sup_id = s.sup_id
            LEFT JOIN employees e ON st.emp_id = e.emp_id
            ${adjustCondition.whereStr}
            ORDER BY st.date_time DESC
        `, adjustCondition.paramsArr);

        const totalRecords = inboundData.length + outboundData.length + adjustData.length;

        const loggedInEmpId = req.session.user.emp_id;
        const [employeeData] = await pool.query(
            `SELECT emp_role FROM employees WHERE emp_id = ?`,
            [loggedInEmpId]
        );
        const currentUserRole = employeeData.length > 0 ? employeeData[0].emp_role : null;

        res.render('transactions/transaction', {
            inboundData,
            outboundData,
            adjustData,
            totalRecords,
            userRole: currentUserRole,
            user: { role: currentUserRole },
            query: req.query
        });

    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Internal Server Error');
    }
};