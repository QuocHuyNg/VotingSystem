const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/vote.controller");
const auth = require("../middlewares/auth.middleware");

router.post("/record", auth, ctrl.recordVote);
router.get("/status/:electionId", ctrl.getVoteStatus);
router.get("/verify/:txHash", ctrl.verifyVote);
router.get("/results/:electionId", ctrl.getResults);
router.get("/my-receipts", auth, ctrl.getMyReceipts); // Lịch sử bỏ phiếu của user

module.exports = router;
