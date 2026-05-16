const express = require("express");
const router = express.Router();
const { register, login, getMe, updateWallet } = require("../controllers/auth.controller");
const auth = require("../middlewares/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getMe);
router.put("/wallet", auth, updateWallet);

module.exports = router;
