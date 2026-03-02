import express from "express";
import ApiConnection from "../models/ApiConnection.js";
import ApiDataPoint from "../models/ApiDataPoint.js";
import verifyFirebaseToken from "../middleware/authMiddleware.js";
import axios from "axios";

const router = express.Router();

router.use(verifyFirebaseToken);

// Save an API's URL for the user, maximum of 5 allowed
router.post("/save-api", async (req, res) => {
  const { name, url, method, headers, mappedFields } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });
  if (!name) return res.status(400).json({ error: "API name is required" });

  const normalizedUrl = String(url).trim();
  try {
    // Check if this is an update (URL already exists for this user)
    const existingApi = await ApiConnection.findOne({
      userId: req.user.uid,
      url: normalizedUrl,
    });

    // If creating new API, check 5-max limit
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

// Save an API's configuration and datapoints which we check against existing mappings if they exist
router.post("/test-api", async (req, res) => {
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

    // Save the response data
    if (saveData && apiConnectionId) {
      try {
        // Decide what to store: if mappings exist, use our extracted subset
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
            // duplicate 
            // create a copy without dataHash or with a modified hash
            const fallback = new ApiDataPoint({
              apiConnectionId,
              userId: req.user.uid,
              values: dataToStore,
            });
            // optionally attach mappedFieldValues again
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
        // Data point save fails
      }
    }

    res.json({ data: response.data, savedDataPoint, isDuplicate });
  } catch (err) {
    res.status(400).json({
      error: err.response?.data || err.message || "Failed to fetch API",
    });
  }
});

// GET all APIs for the authenticated user with data point counts
router.get("/user-apis", async (req, res) => {
  try {
    const apis = await ApiConnection.find({ userId: req.user.uid });

    // Add data point count for each API
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

// GET a specific API by ID
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

// GET data points for a specific API with pagination
router.get("/api/:apiConnectionId/data-points", async (req, res) => {
  const { apiConnectionId } = req.params;
  const { limit = 50, skip = 0 } = req.query;

  try {
    // Verify the API belongs to the user 
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

// GET all unique data for an API
router.get("/api/:apiConnectionId/unique-data", async (req, res) => {
  const { apiConnectionId } = req.params;

  try {
    // Verify the API belongs to the user
    const apiConnection = await ApiConnection.findOne({
      _id: apiConnectionId,
      userId: req.user.uid,
    });

    if (!apiConnection) {
      return res.status(404).json({ error: "API not found" });
    }

    // Get all unique data points sorted by most recent
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

// DELETE all data points for an API (not in use yet)
/*router.delete("/api/:apiConnectionId/data-points", async (req, res) => {
  const { apiConnectionId } = req.params;

  try {
    // Verify the API belongs to the user
    const apiConnection = await ApiConnection.findOne({
      _id: apiConnectionId,
      userId: req.user.uid,
    });

    if (!apiConnection) {
      return res.status(404).json({ error: "API not found" });
    }

    const result = await ApiDataPoint.deleteMany({
      apiConnectionId,
      userId: req.user.uid,
    });

    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});*/

export default router;
