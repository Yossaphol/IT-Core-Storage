const express = require("express");
const router = express.Router();
const pool = require("../db");

// หน้า login
router.get("/login", (req, res) => {
  res.render("login/login");
});

// ตรวจสอบ login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM employees WHERE username = ? AND available = 1",
      [username]
    );

    if (rows.length === 0) {
      return res.send("ไม่พบผู้ใช้");
    }

    const user = rows[0];

    if (password !== user.password) {
      return res.send("รหัสผ่านไม่ถูกต้อง");
    }

    req.session.user = {
      emp_id: user.emp_id,
      name: user.emp_firstname,
      role: user.emp_role
    };

    return res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// หน้า home หลัง login
router.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.render("index");
});

// logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;