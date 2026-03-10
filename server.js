require("dotenv").config();
const fs = require('fs');
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("./db");
const multer = require("multer");
const session = require("express-session");
const warehouseAPI = require("./api/warehouse.api");
const transactionAPI = require("./api/transaction.api");
const { isLoggedIn, allowRoles } = require("./middleware/auth.middleware");
const shelfAPI = require("./api/shelf.api")
const accountAPI = require("./api/account.api");
const searchAPI = require("./api/search.api")
const dashboardAPI = require("./api/dashboard.api");
const receivingAPI = require("./api/receiving.api");
const issuingAPI = require("./api/issuing.api");
const adjustmentAPI = require("./api/adjustment.api");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "warehouse_secret",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));

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
    console.log("Password Match Status:", match);
    console.log("Hashed Password from DB:", user.password);

    if (!match) {
      return res.render("login/login", {
        error: "รหัสผ่านไม่ถูกต้อง"
      });
    }

    req.session.user = {
      emp_id: user.emp_id,
      name: user.emp_firstname + " " + user.emp_lastname,
      username: user.username,
      role: user.emp_role,
      profile_image: user.emp_img
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

app.get('/adjustment', isLoggedIn, (req, res) => {
  res.render('goods_reception/adjustment');
});

app.get('/profile', isLoggedIn, (req, res) => {
  res.render('profile/profile');
})

app.get('/dashboard', isLoggedIn, dashboardAPI.getDashboardData);
// upload profile
app.post("/api/account/upload-profile", isLoggedIn, accountAPI.uploadProfileImage);

// update account info
app.put("/api/account/update", isLoggedIn, accountAPI.updateAccount);

// all transactions
app.get('/transactions', isLoggedIn, transactionAPI.getTransactions);

// all warehouse
app.get("/api/warehouses", warehouseAPI.getAllWarehouses);

app.get("/api/warehouses/managers", warehouseAPI.getManagers);

// get product type
app.get("/api/product-types", warehouseAPI.getProductTypes);

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

// get all query data from searching
app.get("/api/search", searchAPI.search_query)

// adjustment
app.post("/api/adjustment", isLoggedIn, adjustmentAPI.adjustProductAmount);

app.get("/user_management", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const sort   = req.query.sort   || "DESC"; 
        const offset = (page - 1) * limit;

        const searchQuery = `%${search}%`;
        
        let orderBy = "";

        if (sort === "NAME_ASC") {
            orderBy = `
                CASE WHEN emp_firstname REGEXP '^[A-Za-z]' THEN 1 ELSE 2 END ASC, 
                emp_firstname COLLATE utf8mb4_unicode_ci ASC`;
        } else if (sort === "NAME_DESC") {
            orderBy = `
                CASE WHEN emp_firstname REGEXP '^[A-Za-z]' THEN 1 ELSE 2 END ASC, 
                emp_firstname COLLATE utf8mb4_unicode_ci DESC`;
        } else if (sort === "ASC") {
            orderBy = "emp_id ASC";
        } else {
            orderBy = "emp_id DESC";
        }

        const sql = `
            SELECT * FROM employees 
            WHERE available = 1 
            AND (emp_firstname LIKE ? OR emp_lastname LIKE ? OR CONCAT(emp_firstname, ' ', emp_lastname) LIKE ?)
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;

        const [employees] = await pool.query(
            sql,
            [searchQuery, searchQuery, searchQuery, limit, offset]
        );

        const [countResult] = await pool.query(
            "SELECT COUNT(*) as total FROM employees WHERE available = 1 AND (emp_firstname LIKE ? OR emp_lastname LIKE ?)",
            [searchQuery, searchQuery]
        );
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        res.render("management/user", {
            employees,
            total,
            currentPage: page,
            totalPages,
            limit,
            sort,
            search
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


const userStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images/profile"); 
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = "user_" + Date.now() + ext;
    cb(null, filename);
  }
});

const uploadUserImg = multer({ 
    storage: userStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

app.post("/user_management", uploadUserImg.single('emp_img'), async (req, res) => {
  try {
    const { emp_firstname, emp_lastname, username, roles, password } = req.body;

    const [existingUsers] = await pool.query(
      "SELECT * FROM employees WHERE emp_firstname = ? AND emp_lastname = ?",
      [emp_firstname, emp_lastname]
    );

    const roleArray = Array.isArray(roles) ? roles : [roles];
    const roleStr = roleArray.map(r => {
        if (r === 'system') return 'SYSTEM';
        if (r === 'manager') return 'MANAGER';
        if (r === 'warehouse') return 'WAREHOUSE';
        return r.toUpperCase();
    }).join(',');

    const imageName = req.file ? req.file.filename : 'user.png';
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUsers.length > 0) {
      const user = existingUsers[0];

      if (user.available === 1) {
        return res.status(400).send("ผู้ใช้งานชื่อนี้มีอยู่ในระบบแล้ว");
      } else {
        await pool.query(
          `UPDATE employees 
           SET username = ?, password = ?, emp_role = ?, emp_img = ?, available = 1 
           WHERE emp_id = ?`,
          [username, hashedPassword, roleStr, imageName, user.emp_id]
        );
        console.log(`ดึงผู้ใช้เดิมกลับมาใช้งาน: ${emp_firstname}`);
      }
    } else {
      await pool.query(
        "INSERT INTO employees (username, password, emp_firstname, emp_lastname, emp_role, emp_img, available) VALUES (?, ?, ?, ?, ?, ?, 1)",
        [username, hashedPassword, emp_firstname, emp_lastname, roleStr, imageName]
      );
      console.log(`เพิ่มผู้ใช้ใหม่เรียบร้อย: ${emp_firstname}`);
    }

    res.redirect("/user_management");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("ไม่สามารถบันทึกข้อมูลได้");
  }
});

app.post("/user_management/delete/:id", async (req, res) => {
  try {
    await pool.query(
      "UPDATE employees SET available = 0 WHERE emp_id = ?",
      [req.params.id]
    );
    res.redirect("/user_management");
  } catch (err) {
    console.error(err);
    res.redirect("/user_management");
  }
});

app.post("/user_management/bulk-delete", async (req, res) => {
  try {
    const idsString = req.body.deleteIds;

    if (!idsString) {
      return res.redirect("/user_management");
    }

    const idsArray = idsString.split(',');

    await pool.query(
      "UPDATE employees SET available = 0 WHERE emp_id IN (?)",
      [idsArray] 
    );
    
    res.redirect("/user_management");
  } catch (err) {
    console.error("Error bulk deleting employees:", err);
    res.redirect("/user_management");
  }
});

app.post("/user_management/edit/:id", uploadUserImg.single('emp_img'), async (req, res) => {
  try {
    const id = req.params.id;
    const { emp_firstname, emp_lastname, username, roles } = req.body;

    const roleStr = Array.isArray(roles) ? roles.join(',') : roles;

    const [rows] = await pool.query(
      "SELECT emp_img FROM employees WHERE emp_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.redirect("/user_management");
    }

    let imageName = rows[0].emp_img;

    if (req.file) {
      imageName = req.file.filename;
    }

    await pool.query(
      `UPDATE employees 
       SET emp_firstname = ?, 
           emp_lastname = ?, 
           username = ?, 
           emp_role = ?, 
           emp_img = ?
       WHERE emp_id = ?`,
      [emp_firstname, emp_lastname, username, roleStr, imageName, id]
    );

    res.redirect("/user_management");

  } catch (err) {
    console.error("Edit user error:", err);
    res.redirect("/user_management");
  }
});



app.get("/product_management", async (req, res) => {
try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
    const sort   = req.query.sort   || "DESC"; 
    const offset = (page - 1) * limit;

    const searchPattern = `%${search}%`;

    let orderBy = "";

    if (sort === "NAME_ASC") {
        orderBy = `
            CASE WHEN prod_name REGEXP '^[A-Za-z]' THEN 1 ELSE 2 END ASC, 
            prod_name COLLATE utf8mb4_unicode_ci ASC`;
    } else if (sort === "NAME_DESC") {
        orderBy = `
            CASE WHEN prod_name REGEXP '^[A-Za-z]' THEN 1 ELSE 2 END ASC, 
            prod_name COLLATE utf8mb4_unicode_ci DESC`;
    } else if (sort === "ASC") {
        orderBy = "prod_id ASC";
    } else {
        orderBy = "prod_id DESC";
    }

    const [rows] = await pool.query(
      `SELECT products.*, IFNULL(shelf_items.amount, 0) AS amount 
       FROM products 
       LEFT JOIN shelf_items ON products.prod_id = shelf_items.prod_id 
       WHERE products.available = 1 AND products.prod_name LIKE ? 
       ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [searchPattern, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM products WHERE available = 1 AND prod_name LIKE ?",
      [searchPattern]
    );

    res.render("management/product", {
      products: rows,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit,
      total,
      search,
      sort 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error");
  }
  
});

app.post("/product_management/delete/:id", async (req, res) => {
  try {
    await pool.query(
      "UPDATE products SET available = 0 WHERE prod_id = ?",
      [req.params.id]
    );
    res.redirect("/product_management");
  } catch (err) {
    console.error(err);
    res.redirect("/product_management");
  }
});

app.post("/product_management/bulk-delete", async (req, res) => {
  try {
    const idsString = req.body.deleteIds;

    if (!idsString) {
      return res.redirect("/product_management");
    }

    const idsArray = idsString.split(',');

    await pool.query(
      "UPDATE products SET available = 0 WHERE prod_id IN (?)",
      [idsArray] 
    );
    
    res.redirect("/product_management");
  } catch (err) {
    console.error("Error bulk deleting products:", err);
    res.redirect("/product_management");
  }
});

// ตั้งค่าให้ Multer เซฟชื่อไฟล์ชั่วคราวไปก่อน
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/products_img'); 
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); 
        // เซฟเป็นชื่อชั่วคราว เช่น temp-1701234567.png
        cb(null, 'temp-' + Date.now() + ext); 
    }
});

const upload = multer({ storage: storage });

app.post('/product_management', upload.single('product_img'), async (req, res) => {
    try {
        const { prod_name, description, prod_code, brand, prod_type } = req.body;
        
        const [existingProduct] = await pool.query(
            "SELECT * FROM products WHERE prod_code = ?",
            [prod_code]
        );

        let prod_img;
        
        if (req.file) {
            try {
                const ext = path.extname(req.file.originalname);
                const newFilename = `${prod_code}${ext}`; 
                
                const oldPath = req.file.path; 
                const newPath = path.join(req.file.destination, newFilename); 

                fs.renameSync(oldPath, newPath);

                prod_img = `/images/products_img/${newFilename}`; 
            } catch (fileError) {
                console.error(fileError);
                prod_img = `/images/products_img/${req.file.filename}`; 
            }
        } else {
            if (existingProduct.length > 0) {
                prod_img = existingProduct[0].prod_img;
            } else {
                prod_img = '/images/products_img/no-product-image.jpeg';
            }
        }

        if (existingProduct.length > 0) {
            const sqlUpdate = `
                UPDATE products 
                SET prod_name = ?, description = ?, prod_type = ?, brand = ?, prod_img = ?, available = 1
                WHERE prod_code = ?
            `;
            const updateValues = [prod_name, description, prod_type, brand, prod_img, prod_code];
            
            await pool.query(sqlUpdate, updateValues);
        } else {
            const sqlInsert = `
                INSERT INTO products 
                (prod_code, prod_name, description, prod_type, prod_img, brand) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const insertValues = [prod_code, prod_name, description, prod_type, prod_img, brand];
            
            await pool.query(sqlInsert, insertValues);
        }

        res.redirect('/product_management');

    } catch (error) {
        console.error(error);
        res.status(500).send("Database Error");
    }
});



app.get("/supplier_management", async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
    const sort   = req.query.sort   || "DESC"; 
    const offset = (page - 1) * limit;

    const searchPattern = `%${search}%`;

    let orderBy = "";

    if (sort === "NAME_ASC") {
        orderBy = `
            CASE WHEN comp_name REGEXP '^[A-Za-z]' THEN 1 ELSE 2 END ASC, 
            comp_name COLLATE utf8mb4_unicode_ci ASC`;
    } else if (sort === "NAME_DESC") {
        orderBy = `
            CASE WHEN comp_name REGEXP '^[A-Za-z]' THEN 1 ELSE 2 END ASC, 
            comp_name COLLATE utf8mb4_unicode_ci DESC`;
    } else if (sort === "ASC") {
        orderBy = "sup_id ASC";
    } else {
        orderBy = "sup_id DESC";
    }

    const [rows] = await pool.query(
      `SELECT * FROM suppliers WHERE available = 1 AND comp_name LIKE ? ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [searchPattern, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM suppliers WHERE available = 1 AND comp_name LIKE ?",
      [searchPattern]
    );

    res.render("management/supplier", {
      suppliers: rows,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit,
      total,
      search,
      sort 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error");
  }
});

app.post("/supplier_management/edit/:id", async (req, res) => {
  try {
    const { comp_name, comp_phone } = req.body;

    await pool.query(
      "UPDATE suppliers SET comp_name = ?, comp_phone = ? WHERE sup_id = ?",
      [comp_name, comp_phone, req.params.id]
    );

    res.redirect("/supplier_management");

  } catch (err) {
    console.error(err);
    res.redirect("/supplier_management");
  }
});

app.post("/supplier_management/delete/:id", async (req, res) => {
  try {
    await pool.query(
      "UPDATE suppliers SET available = 0 WHERE sup_id = ?",
      [req.params.id]
    );
    res.redirect("/supplier_management");
  } catch (err) {
    console.error(err);
    res.redirect("/supplier_management");
  }
});

app.post("/supplier_management/bulk-delete", async (req, res) => {
  try {
    const idsString = req.body.deleteIds;

    if (!idsString) {
      return res.redirect("/supplier_management");
    }

    const idsArray = idsString.split(',');

    await pool.query(
      "UPDATE suppliers SET available = 0 WHERE sup_id IN (?)",
      [idsArray] 
    );
    
    res.redirect("/supplier_management");
  } catch (err) {
    console.error("Error bulk deleting suppliers:", err);
    res.redirect("/supplier_management");
  }
});

app.post("/supplier_management", async (req, res) => {
  try {
    const { comp_name, comp_phone } = req.body;

    const [existing] = await pool.query(
      "SELECT * FROM suppliers WHERE comp_name = ? AND comp_phone = ?",
      [comp_name, comp_phone]
    );

    if (existing.length > 0) {
      const supplier = existing[0];

      if (supplier.available === 0) {
        await pool.query(
          "UPDATE suppliers SET available = 1 WHERE sup_id = ?",
          [supplier.sup_id]
        );
      }

    } else {
      await pool.query(
        "INSERT INTO suppliers (comp_name, comp_phone, available) VALUES (?, ?, 1)",
        [comp_name, comp_phone]
      );
    }

    res.redirect("/supplier_management");

  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error");
  }
});

// receiving
app.get('/receiving', isLoggedIn, receivingAPI.getReceivingPage);

// add item to warehouse
app.post("/api/receiving/add", isLoggedIn, receivingAPI.addReceiving);

app.get('/issuing', isLoggedIn, issuingAPI.getIssuingPage);

app.post("/api/issuing/add", isLoggedIn, issuingAPI.addIssuing);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
