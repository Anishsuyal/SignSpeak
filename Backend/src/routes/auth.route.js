const router = require("express").Router();
const { register, login } = require("../controllers/auth.controller");
const protect = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);

router.get("/profile", protect, (req, res) => {
  res.status(200).json({ message: "Profile data", user: req.user });
});
 
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

module.exports = router;