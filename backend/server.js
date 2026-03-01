import express from "express";
import cors from "cors";
import apiRoutes from "./src/routes/apiRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  // Default route
  res.send({ status: "Backend working" });
});

app.use("/api", apiRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
