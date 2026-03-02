import mongoose from "mongoose";

const ApiDataPointSchema = new mongoose.Schema({
  apiConnectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ApiConnection",
    required: true,
  },
  userId: { type: String, required: true }, // Firebase UID for quick filtering
  values: { type: Object, required: true }, // actual data/response from API
  mappedFieldValues: { type: Object, default: {} }, // extracted values from mappedFields (e.g., { "data.users[0].id": "123" })
  timestamp: { type: Date, default: Date.now },
});

// Index for quick filtering by userId and apiConnectionId
ApiDataPointSchema.index({ userId: 1, apiConnectionId: 1, timestamp: -1 });

// Normalize paths by converting array indices to [*]
// Handles both bracket notation (users[0].name) and dot notation (users.0.name or 0.userId)
// e.g., "users[0].name" → "users[*].name", "0.userId" → "[*].userId", "users.0.id" → "users[*].id"
ApiDataPointSchema.statics.normalizePath = function (path) {
  // Replace bracket notation [N] with [*]
  let normalized = path.replace(/\[\d+\]/g, "[*]");

  // For dot notation with leading numbers (e.g., "0.userId" → "[*].userId")
  if (/^\d+\./.test(normalized)) {
    normalized = `[*].${normalized.replace(/^\d+\./, "")}`;
  }

  // Replace numeric segment between dots with [*] (e.g., "users.0.name" → "users[*].name")
  normalized = normalized.replace(/\.(\d+)\./g, "[*].");

  // Handle trailing numeric segment (e.g., "users.0" → "users[*]")
  normalized = normalized.replace(/\.(\d+)$/g, "[*]");

  return normalized;
};

// Method to extract values from mappedFields paths
// Will intelligently handles array patterns: users[0].name and users[1].name both extract as users[*].name, ****TODO: UPDATE ALGORITHMS LATER TO RESOLVE MORE COMPLEX RESPONSES
ApiDataPointSchema.methods.extractMappedValues = function (mappedFields) {
  const extracted = {};
  const normalizedPaths = new Set();

  mappedFields.forEach((originalPath) => {
    const normalizedPath =
      ApiDataPointSchema.statics.normalizePath(originalPath);

    // Skip if we've already processed this normalized pattern
    if (normalizedPaths.has(normalizedPath)) {
      return;
    }
    normalizedPaths.add(normalizedPath);

    try {
      // If the path contains [*], extract from ALL array elements
      if (normalizedPath.includes("[*]")) {
        const values = this._extractAllArrayMatches(normalizedPath);
        if (values.length > 0) {
          extracted[normalizedPath] = values;
        }
      } else {
        // Regular path extraction
        const keys = normalizedPath.split(".");
        let value = this.values;

        for (const key of keys) {
          const match = key.match(/^(\w+)(?:\[(\d+)\])?$/);
          if (match) {
            value = value[match[1]];
            if (match[2] !== undefined) {
              value = value[parseInt(match[2])];
            }
          } else {
            value = value[key];
          }

          if (value === undefined) break;
        }

        if (value !== undefined) {
          extracted[normalizedPath] = value;
        }
      }
    } catch (err) {
      console.error(`Error extracting path ${originalPath}:`, err.message);
    }
  });

  return extracted;
};

// Helper method to extract values matching a pattern with [*]
ApiDataPointSchema.methods._extractAllArrayMatches = function (pattern) {
  const results = [];
  const parts = pattern.split(".");
  let current = this.values;

  try {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Match patterns like "[*]", "key", or "key[*]"
      const match = part.match(/^(\w*)(?:\[(\*|\d+)\])?$/);

      if (!match) continue;

      const key = match[1];
      const bracketPart = match[2];

      // Handle [*] at the start (root-level array)
      if (part === "[*]") {
        if (!Array.isArray(current)) {
          continue;
        }
        const remainingPath = parts.slice(i + 1).join(".");
        current.forEach((item) => {
          let value = item;
          if (remainingPath) {
            const remainingKeys = remainingPath.split(".");
            for (const rkey of remainingKeys) {
              if (value && typeof value === "object") {
                value = value[rkey];
              } else {
                break;
              }
            }
          }
          if (value !== undefined) {
            results.push(value);
          }
        });
        break;
      } else if (bracketPart === "*") {
        // Handle key[*]
        if (!Array.isArray(current[key])) {
          continue;
        }
        const remainingPath = parts.slice(i + 1).join(".");
        current[key].forEach((item) => {
          let value = item;
          if (remainingPath) {
            const remainingKeys = remainingPath.split(".");
            for (const rkey of remainingKeys) {
              if (value && typeof value === "object") {
                value = value[rkey];
              } else {
                break;
              }
            }
          }
          if (value !== undefined) {
            results.push(value);
          }
        });
        break; // We've processed the array, exit loop
      } else if (key) {
        // Regular key navigation
        current = current[key];
        if (current === undefined) break;
      }
    }
  } catch (err) {
    console.error(`Error extracting array pattern ${pattern}:`, err.message);
  }

  return results;
};

export default mongoose.model("ApiDataPoint", ApiDataPointSchema);
