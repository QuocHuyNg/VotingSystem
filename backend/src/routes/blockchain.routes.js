const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/blockchain.controller");

router.get("/info", ctrl.getInfo);
router.get("/blocks", ctrl.getRecentBlocks);
router.get("/tx/:hash", ctrl.getTransaction);
router.get("/activity", ctrl.getSystemActivity);

module.exports = router;
