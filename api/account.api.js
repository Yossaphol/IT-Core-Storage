const path = require("path");
const multer = require("multer");
const bcrypt = require("bcrypt");
const pool = require("../db");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images/profile");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = "emp_" + req.session.user.emp_id + "_" + Date.now() + ext;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpg", "image/jpeg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }
    cb(null, true);
  }
});

const uploadProfileImage = [
  upload.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false });
      }

      const emp_id = req.session.user.emp_id;
      const imageName = req.file.filename;

      await pool.query(
        "UPDATE employees SET emp_img = ? WHERE emp_id = ?",
        [imageName, emp_id]
      );

      req.session.user.profile_image = imageName;

      return res.json({
        success: true,
        imagePath: imageName
      });

    } catch (err) {
      return res.status(500).json({ success: false });
    }
  }
];

const updateAccount = async (req, res) => {
  try {
    const emp_id = req.session.user.emp_id;
    const { username, oldPassword, newPassword } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM employees WHERE emp_id = ?",
      [emp_id]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ success: false });
    }

    let newUsername = user.username;
    let newHashedPassword = user.password;

    if (username && username !== user.username) {
      newUsername = username;
    }

    if (oldPassword && newPassword) {
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: "Old password incorrect"
        });
      }

      newHashedPassword = await bcrypt.hash(newPassword, 10);
    }

    await pool.query(
      "UPDATE employees SET username = ?, password = ? WHERE emp_id = ?",
      [newUsername, newHashedPassword, emp_id]
    );

    req.session.user.username = newUsername;

    return res.json({ success: true });

  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

module.exports = {
  uploadProfileImage,
  updateAccount
};