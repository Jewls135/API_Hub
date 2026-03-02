import express from "express";
import cors from "cors";

import connectDB from "./src/config/db.js";
import apiRoutes from "./src/routes/apiRoutes.js";

const app = express();
connectDB(); // Initializing db on server start

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes); // All /api routes now automatically require token validation

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));