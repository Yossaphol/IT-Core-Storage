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


app.get('/', (req, res) => {
  res.render('index')
});

app.get('/warehouse_management', (req, res) => {
  res.render('warehouse_management/wh_overview');
});

app.get('/warehouse_management/create', (req, res) => {
  res.render('warehouse_management/wh_creating')
})

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

// one warehouse
app.get("/api/warehouses/:id", warehouseAPI.getWarehouseById);

// create warehouse
app.post("/api/warehouses/add", warehouseAPI.addWarehouse);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});