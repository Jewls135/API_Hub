import express from "express";
import axios from "axios";
//import verifyFirebaseToken from "../middleware/verifyFirebaseToken.js"; // Outline for now

const router = express.Router();

// POST -| /api/test-api |-
router.post("/test-api", async (req, res) => {
    const { url, method = "GET", headers = {} } = req.body;

    try {
        const response = await axios({
            url,
            method,
            headers
        });

        res.json(response.data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET -| /api/test-api |-
router.get("/test-api", (req, res) => {
    res.json({
        message: "API Route Working",
        time: new Date()
    });
});

export default router;