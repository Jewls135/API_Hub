import express from "express";
import cors from "cors";

import connectDB from "./src/config/db.js";
import apiRoutes from "./src/routes/apiRoutes.js";
import JobWorker from "./src/services/JobWorker.js";

const app = express();
connectDB(); // Initializing db on server start

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes); // All /api routes now automatically require token validation

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));