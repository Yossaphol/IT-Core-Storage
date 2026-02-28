require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");
const warehouseAPI = require("./api/warehouse.api");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));

app.get('/login', (req, res) => {
  res.render('login/login');
});

app.get('/', async (req, res) => {
	try{
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
		const [sh_rows] = await pool.query(sh_query)
		res.render('index', {stock: st_rows, shelf:sh_rows, curr_wh:wh_id, st_count:st_rows.length})
	} catch(err)
	{
		res.status(500).send("Server error");
	}
});

app.get('/warehouse_management', async (req, res) => {
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

app.get('/warehouse_management/create', (req, res) => {
  res.render('warehouse_management/wh_creating')
})

app.get('/warehouse_management/edit', async (req, res) => {
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

app.get('/warehouse_management/stock/edit', async (req, res) => {
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

app.get('/warehouse_management/stock/create', async (req, res) => {

  try {

    const [result] = await pool.query(
      `SELECT wh_id, wh_name FROM warehouse`
    );

    res.render('stock_management/stock_creating', { warehouses: result });

  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.get('/receiving', (req, res) => {
  res.render('goods_reception/receiving');
});

app.get('/issuing', (req, res) => {
  res.render('goods_reception/issuing');
});

app.get('/adjustment', (req, res) => {
  res.render('goods_reception/adjustment');
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


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});