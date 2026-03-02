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

// all transactions
app.get('/transactions', isLoggedIn, transactionAPI.getTransactions);
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
