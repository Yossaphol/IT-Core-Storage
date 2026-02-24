require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => {
  res.render('index')
});

app.get('/warehouse_management', (req, res) => {
  res.render('warehouse_management/wh_overview');
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

// database testing
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY prod_id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});