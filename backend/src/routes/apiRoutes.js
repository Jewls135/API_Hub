import express from "express";
import verifyFirebaseToken from "../middleware/authMiddleware.js";
import automationRoutes from "./api/automationRoutes.js";
import connectionRoutes from "./api/connectionRoutes.js";

const router = express.Router();

router.use(verifyFirebaseToken);

router.use(connectionRoutes);
router.use(automationRoutes);

export default router;
