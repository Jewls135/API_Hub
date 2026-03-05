import express from "express";
import axios from "axios";
import ApiConnection from "../../models/ApiConnection.js";
import ApiDataPoint from "../../models/ApiDataPoint.js";

const router = express.Router();

/**
 * Execute an outbound API call and optionally persist the response.
 * When mapped fields exist, stores extracted values for consistent charting.
 */
router.post("/execute-api", async (req, res) => {
  const {
    url,
    method,
    headers,
    body,
    apiConnectionId,
    mappedFields,
    saveData,
  } = req.body;

  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const response = await axios({
      url,
      method: method || "GET",
      headers: headers || {},
      data: body || {},
    });

    let savedDataPoint = null;
    let isDuplicate = false;

    // Persist data only when explicitly requested by the client.
    if (saveData && apiConnectionId) {
      try {
        // Prefer mapped extracts when available.
        let dataToStore = response.data;
        let extracted = null;

        if (
          mappedFields &&
          Array.isArray(mappedFields) &&
          mappedFields.length > 0
        ) {
          const temp = new ApiDataPoint({ values: response.data });
          extracted = temp.extractMappedValues(mappedFields);
          if (Object.keys(extracted).length > 0) {
            dataToStore = extracted;
          }
        }

        const newDataPoint = new ApiDataPoint({
          apiConnectionId,
          userId: req.user.uid,
          values: dataToStore,
        });

        if (extracted) {
          newDataPoint.mappedFieldValues = extracted;
        } else if (
          mappedFields &&
          Array.isArray(mappedFields) &&
          mappedFields.length > 0
        ) {
          newDataPoint.mappedFieldValues =
            newDataPoint.extractMappedValues(mappedFields);
        }

        try {
          savedDataPoint = await newDataPoint.save();
        } catch (saveErr) {
          if (saveErr.code === 11000) {
            // Retry with a fresh document instance if a duplicate hash is detected.
            const fallback = new ApiDataPoint({
              apiConnectionId,
              userId: req.user.uid,
              values: dataToStore,
            });
            // Preserve mapped values on fallback writes.
            if (extracted) {
              fallback.mappedFieldValues = extracted;
            } else if (
              mappedFields &&
              Array.isArray(mappedFields) &&
              mappedFields.length > 0
            ) {
              fallback.mappedFieldValues =
                fallback.extractMappedValues(mappedFields);
            }
            savedDataPoint = await fallback.save();
          } else {
            throw saveErr;
          }
        }
      } catch (err) {
        console.error("Error saving data point:", err.message);
        // Do not fail the request if persistence fails after a successful fetch.
      }
    }

    res.json({ data: response.data, savedDataPoint, isDuplicate });
  } catch (err) {
    res.status(400).json({
      error: err.response?.data || err.message || "Failed to fetch API",
    });
  }
});

/**
 * Create or update a saved API connection.
 * Enforces a maximum of 5 saved APIs per user.
 */
router.post("/save-api", async (req, res) => {
  const { name, url, method, headers, mappedFields } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });
  if (!name) return res.status(400).json({ error: "API name is required" });

  const normalizedUrl = String(url).trim();
  try {
    // If a URL already exists for this user, treat as update.
    const existingApi = await ApiConnection.findOne({
      userId: req.user.uid,
      url: normalizedUrl,
    });

    // New records are limited to five per user.
    if (!existingApi) {
      const userApiCount = await ApiConnection.countDocuments({
        userId: req.user.uid,
      });

      if (userApiCount >= 5) {
        return res
          .status(400)
          .json({ error: "You can save a maximum of 5 APIs" });
      }
    }

    const update = {
      userId: req.user.uid,
      name: name,
      url: normalizedUrl,
      method: method || "GET",
      headers: headers || {},
      mappedFields: mappedFields || [],
    };

    const apiConnection = await ApiConnection.findOneAndUpdate(
      { userId: req.user.uid, url: normalizedUrl },
      { $set: update, $setOnInsert: { createdAt: new Date() } },
      { returnDocument: "after", upsert: true, runValidators: true },
    );

    res.json(apiConnection);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "Duplicate API entry for this user" });
    }
    res.status(400).json({ error: err.message });
  }
});

/**
 * Return all saved APIs with their data point counts.
 */
router.get("/user-apis", async (req, res) => {
  try {
    const apis = await ApiConnection.find({ userId: req.user.uid });

    // Attach count metadata for dashboard summaries.
    const apisWithCounts = await Promise.all(
      apis.map(async (api) => {
        const count = await ApiDataPoint.countDocuments({
          apiConnectionId: api._id,
          userId: req.user.uid,
        });
        return {
          ...api.toObject(),
          dataCount: count,
        };
      }),
    );

    res.json(apisWithCounts);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Return a single saved API by ID with its data count.
 */
router.get("/api/:apiConnectionId", async (req, res) => {
  const { apiConnectionId } = req.params;

  try {
    const apiConnection = await ApiConnection.findOne({
      _id: apiConnectionId,
      userId: req.user.uid,
    });

    if (!apiConnection) {
      return res.status(404).json({ error: "API not found" });
    }

    const dataCount = await ApiDataPoint.countDocuments({
      apiConnectionId,
      userId: req.user.uid,
    });

    res.json({
      ...apiConnection.toObject(),
      dataCount,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Return data points for a saved API.
 */
router.get("/api/:apiConnectionId/data-points", async (req, res) => {
  const { apiConnectionId } = req.params;
  const { limit = 50, skip = 0 } = req.query;

  try {
    // Prevent cross-user access.
    const apiConnection = await ApiConnection.findOne({
      _id: apiConnectionId,
      userId: req.user.uid,
    });

    if (!apiConnection) {
      return res.status(404).json({ error: "API not found" });
    }

    const dataPoints = await ApiDataPoint.find({
      apiConnectionId,
      userId: req.user.uid,
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ApiDataPoint.countDocuments({
      apiConnectionId,
      userId: req.user.uid,
    });

    res.json({
      dataPoints,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Return unique data points for graphing and trend views.
 */
router.get("/api/:apiConnectionId/unique-data", async (req, res) => {
  const { apiConnectionId } = req.params;

  try {
    // Prevent cross-user access.
    const apiConnection = await ApiConnection.findOne({
      _id: apiConnectionId,
      userId: req.user.uid,
    });

    if (!apiConnection) {
      return res.status(404).json({ error: "API not found" });
    }

    // Sort newest first for immediate UI relevance.
    const uniqueData = await ApiDataPoint.find({
      apiConnectionId,
      userId: req.user.uid,
    })
      .select("values mappedFieldValues timestamp")
      .sort({ timestamp: -1 });

    res.json(uniqueData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
