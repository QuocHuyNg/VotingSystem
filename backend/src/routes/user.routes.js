const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/user.controller");
const auth = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

router.get("/", auth, requireRole("admin"), ctrl.getAllUsers);
router.get("/voters/:electionId", auth, requireRole("admin"), ctrl.getElectionVoters);
router.post("/voters/:electionId/authorize", auth, requireRole("admin"), ctrl.authorizeVoter);
router.post("/voters/:electionId/authorize-batch", auth, requireRole("admin"), ctrl.authorizeVotersBatch);
router.delete("/voters/:electionId/:wallet", auth, requireRole("admin"), ctrl.revokeVoter);

module.exports = router;
