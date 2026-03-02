require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("./db");
const session = require("express-session");
const warehouseAPI = require("./api/warehouse.api");
const transactionAPI = require("./api/transaction.api");
const { isLoggedIn, allowRoles } = require("./middleware/auth.middleware");
const shelfAPI = require("./api/shelf.api")

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "warehouse_secret",
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));

// context สำหรับเช็ค role user
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.role = req.session.user?.role || null;
  res.locals.isLoggedIn = !!req.session.user;
  next();
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("login/login", { error: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM employees WHERE username = ? AND available = 1",
      [username]
    );

    if (rows.length === 0) {
      return res.render("login/login", {
        error: "ไม่พบผู้ใช้"
      });
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render("login/login", {
        error: "รหัสผ่านไม่ถูกต้อง"
      });
    }

    req.session.user = {
      emp_id: user.emp_id,
      name: user.emp_firstname,
      role: user.emp_role
    };

    return res.redirect("/");

  } catch (err) {
    return res.render("login/login", {
      error: "Server error"
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get('/', isLoggedIn, async (req, res) => {
  try {
    const wh_id_q = req.query.w;
    let wh_id = null;

    if (wh_id_q) {
      wh_id = Buffer.from(wh_id_q, 'base64').toString('utf-8');
    }

    const st_query = `select * from stock;`
    const sh_query = `select * from shelf;`

    const [st_rows] = await pool.query(st_query)

    if (!wh_id && st_rows.length > 0) {
      wh_id = st_rows[0].wh_id;
    }

    const [st_rows_id] = await pool.query(
      "select * from stock where wh_id = ?",
      [wh_id]
    );

    const [sh_rows] = await pool.query(sh_query)

    res.render('index', {
      stock: st_rows,
      shelf: sh_rows,
      curr_wh: wh_id,
      st_count: st_rows_id.length
    });

  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.use("/warehouse_management", allowRoles("MANAGER"));

app.get('/warehouse_management', isLoggedIn, async (req, res) => {
  try {
    const query = `SELECT COUNT(wh_id) AS count FROM warehouse;`;
    const [rows] = await pool.query(query);

    const count = parseInt(rows[0].count);

    res.render('warehouse_management/wh_overview', { amount: count });

  } catch (err) {
    console.error(err);   
    res.status(500).send("Server error");
  }
});

app.get('/warehouse_management/create', isLoggedIn, (req, res) => {
  res.render('warehouse_management/wh_creating')
})

app.get('/warehouse_management/edit', isLoggedIn, async (req, res) => {
  try {
    const query = `SELECT COUNT(wh_id) AS count FROM warehouse;`;
    const [rows] = await pool.query(query);
    const { wh_id } = req.query;

    const [result] = await pool.query(`
      SELECT wh_id, wh_name
      FROM warehouse
      ORDER BY wh_id
    `);

    const count = parseInt(rows[0].count);

    res.render('warehouse_management/wh_editing', { 
      amount: count, 
      warehouses: result, 
      activeId: wh_id ? parseInt(wh_id) : null 
    });

  } catch (err) {
    res.status(500).send("Server error");
  }
})

app.get('/warehouse_management/stock/edit', isLoggedIn, async (req, res) => {
  try {
    const { stock_id } = req.query;

    const [result] = await pool.query(
      `SELECT stock_id, stock_name, capacity, wh_id
        FROM stock
        WHERE stock_id = ?`,
      [stock_id]
    );

    res.render('stock_management/stock_editing', {
      stock: result[0]
    });

  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.get('/warehouse_management/stock/create', isLoggedIn, async (req, res) => {

  try {

    const [result] = await pool.query(
      `SELECT wh_id, wh_name FROM warehouse`
    );

    res.render('stock_management/stock_creating', { warehouses: result });

  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.get('/receiving', isLoggedIn, (req, res) => {
  res.render('goods_reception/receiving');
});

app.get('/issuing', isLoggedIn, (req, res) => {
  res.render('goods_reception/issuing');
});

app.get('/adjustment', isLoggedIn, (req, res) => {
  res.render('goods_reception/adjustment');
});

app.get('/transactions', async (req, res) => {
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
                whereStr: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
                paramsArr: params
            };
        };

        // 1. ดึงข้อมูล "สินค้าเข้า" (IN)
        const inCondition = buildConditions('IN');
        const [inboundData] = await pool.query(`
            SELECT st.trans_id, p.prod_img, p.prod_name, p.brand, p.prod_code, p.prod_type, 
                   st.date_time, s.comp_name AS sender, e.emp_firstname, e.emp_lastname
            FROM stock_transition st
            LEFT JOIN products p ON st.prod_id = p.prod_id
            LEFT JOIN suppliers s ON st.sup_id = s.sup_id
            LEFT JOIN employees e ON st.emp_id = e.emp_id
            ${inCondition.whereStr}
            ORDER BY st.date_time DESC
        `, inCondition.paramsArr);

        // 2. ดึงข้อมูล "เบิกจ่าย" (OUT)
        const outCondition = buildConditions('OUT');
        const [outboundData] = await pool.query(`
            SELECT st.trans_id, p.prod_img, p.prod_name, p.brand, p.prod_code, p.prod_type, 
                   st.date_time, s.comp_name AS requester, e.emp_firstname, e.emp_lastname
            FROM stock_transition st
            LEFT JOIN products p ON st.prod_id = p.prod_id
            LEFT JOIN suppliers s ON st.sup_id = s.sup_id
            LEFT JOIN employees e ON st.emp_id = e.emp_id
            ${outCondition.whereStr}
            ORDER BY st.date_time DESC
        `, outCondition.paramsArr);

        // 3. ดึงข้อมูล "ปรับแก้ไข" (ADJUST)
        const adjustCondition = buildConditions('ADJUST');
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

const loggedInEmpId = 1; 
        
        const [employeeData] = await pool.query(
            `SELECT emp_role FROM employees WHERE emp_id = ?`,
            [loggedInEmpId]
        );

        // const currentUserRole = "EE";
        const currentUserRole = employeeData.length > 0 ? employeeData[0].emp_role : null;

        res.render('transactions/transaction', {
            inboundData,
            outboundData,
            adjustData,
            totalRecords,
            query: req.query, // ส่งคืน query กลับไปให้ Frontend แสดงผลค้างไว้
            userRole: currentUserRole
        });

    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Internal Server Error');
    }
});

// all warehouse
app.get("/api/warehouses", warehouseAPI.getAllWarehouses);

// create warehouse
app.post("/api/warehouses/add", warehouseAPI.addWarehouse);

// create stock
app.post("/api/warehouses/stocks/create", warehouseAPI.createStock);

// get stock in each warehouse
app.get("/api/warehouses/:id/stocks", warehouseAPI.getStocksByWarehouse);

// one warehouse
app.get("/api/warehouses/:id", warehouseAPI.getWarehouseById);

// update stock
app.put("/api/stocks/:id", warehouseAPI.updateStock);

// delete stock
app.delete("/api/stocks/:id", warehouseAPI.deleteStock);

// delete warehouse
app.delete("/api/warehouses/:id", warehouseAPI.deleteWarehouse);

// get shelf by stock id
app.get("/api/get-shelf/:id", shelfAPI.getShelfByStockId);

// get all products in shelf by shelf_id
app.get("/api/get-shelf/:id/products", shelfAPI.getAllProductInShelf);


app.get('/user_management', (req, res) => {
  res.render('management/user');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
