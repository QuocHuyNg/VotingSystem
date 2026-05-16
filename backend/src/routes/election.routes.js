const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/election.controller");
const auth = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

router.get("/stats", auth, requireRole("admin"), ctrl.getStats);
router.get("/", ctrl.getAllElections);
router.get("/:id", ctrl.getElectionById);
router.post("/", auth, requireRole("admin"), ctrl.createElection);
router.put("/:id/status", auth, requireRole("admin"), ctrl.updateElectionStatus);
router.delete("/:id", auth, requireRole("admin"), ctrl.deleteElection);
router.post("/:id/candidates", auth, requireRole("admin"), ctrl.addCandidate);

module.exports = router;
