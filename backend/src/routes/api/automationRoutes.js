import express from "express";
import ApiJob from "../../models/ApiJob.js";
import ApiConnection from "../../models/ApiConnection.js";

const router = express.Router();

/**
 * Create or update an automation job for the authenticated user.
 * Re-activates existing jobs and resets the schedule timer.
 */
router.post("/automation", async (req, res) => {
  const { url, method, headers, mappedFields, intervalMs, apiConnectionId } =
    req.body;
  const userId = req.user.uid;

  if (!url || !intervalMs) {
    return res.status(400).json({ error: "URL and interval are required" });
  }

  try {
    let resolvedApiConnectionId = apiConnectionId;
    if (!resolvedApiConnectionId) {
      const matchedApi = await ApiConnection.findOne({ userId, url }).select(
        "_id",
      );
      resolvedApiConnectionId = matchedApi?._id || null;
    }

    // Upsert ensures one active job per user + URL.
    const job = await ApiJob.findOneAndUpdate(
      { userId, url },
      {
        apiConnectionId: resolvedApiConnectionId,
        method,
        headers,
        mappedFields,
        intervalMs,
        active: true,
        lastRun: null,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    res.json({ success: true, job });
  } catch (err) {
    console.error("Error saving job:", err.message);
    res.status(500).json({ error: "Failed to save job" });
  }
});

/**
 * List active automation jobs for the authenticated user.
 */
router.get("/automation", async (req, res) => {
  const userId = req.user.uid;

  try {
    const jobs = await ApiJob.find({ userId, active: { $ne: false } }).sort({
      lastRun: -1,
      createdAt: -1,
    });

    res.json({ success: true, jobs });
  } catch (err) {
    console.error("Error fetching jobs:", err.message);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

/**
 * Deactivate an automation job.
 */
router.post("/automation/:jobId/stop", async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await ApiJob.findByIdAndUpdate(jobId, { active: false });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Error stopping job:", err.message);
    res.status(500).json({ error: "Failed to stop job" });
  }
});

/**
 * Fetch a single automation job by ID.
 */
router.get("/automation/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.uid;

  if (!jobId) {
    return res.status(400).json({ error: "Job ID is required" });
  }

  try {
    const job = await ApiJob.findOne({ _id: jobId, userId });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ success: true, job });
  } catch (err) {
    console.error("Error fetching job:", err.message);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

export default router;
