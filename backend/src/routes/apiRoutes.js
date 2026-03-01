import express from "express";
const router = express.Router();

router.get("/test-api", (req, res) =>{
    res.json({
        message: "API Route Working",
        time: new Date()
    });
});

export default router