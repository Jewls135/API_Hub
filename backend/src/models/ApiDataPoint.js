import mongoose from "mongoose";

const ApiDataPointSchema = new mongoose.Schema({
  apiConnectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ApiConnection",
    required: true,
  },
  userId: { type: String, required: true },
  values: { type: Object, required: true },
  mappedFieldValues: { type: Object, default: {} }, 
  timestamp: { type: Date, default: Date.now },
});

ApiDataPointSchema.index({ userId: 1, apiConnectionId: 1, timestamp: -1 });

/**
 * Normalize mapped-field paths so array index variants share one key format.
 *
 * Examples:
 * - users[0].name -> users[*].name
 * - users.0.name -> users[*].name
 * - 0.userId -> [*].userId
 */
ApiDataPointSchema.statics.normalizePath = function (path) {
  // Convert bracket notation indexes.
  let normalized = path.replace(/\[\d+\]/g, "[*]");

  // Convert leading numeric segments.
  if (/^\d+\./.test(normalized)) {
    normalized = `[*].${normalized.replace(/^\d+\./, "")}`;
  }

  // Convert middle numeric segments.
  normalized = normalized.replace(/\.(\d+)\./g, "[*].");

  // Convert trailing numeric segments.
  normalized = normalized.replace(/\.(\d+)$/g, "[*]");

  return normalized;
};

/**
 * Extract values using mapped-field paths from the current data point payload.
 * Array path variants are grouped under a normalized key.
 */
ApiDataPointSchema.methods.extractMappedValues = function (mappedFields) {
  const extracted = {};
  const normalizedPaths = new Set();

  mappedFields.forEach((originalPath) => {
    const normalizedPath =
      ApiDataPointSchema.statics.normalizePath(originalPath);

    // Avoid duplicate extraction for equivalent array paths.
    if (normalizedPaths.has(normalizedPath)) {
      return;
    }
    normalizedPaths.add(normalizedPath);

    try {
      // Expand wildcard array segments.
      if (normalizedPath.includes("[*]")) {
        const values = this._extractAllArrayMatches(normalizedPath);
        if (values.length > 0) {
          extracted[normalizedPath] = values;
        }
      } else {
        // Resolve a non-wildcard object path.
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

/**
 * Resolve wildcard patterns (for example: users[*].name) against payload data.
 */
ApiDataPointSchema.methods._extractAllArrayMatches = function (pattern) {
  const results = [];
  const parts = pattern.split(".");
  let current = this.values;

  try {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Match segments like [*], key, or key[*].
      const match = part.match(/^(\w*)(?:\[(\*|\d+)\])?$/);

      if (!match) continue;

      const key = match[1];
      const bracketPart = match[2];

      // Handle root-level wildcard arrays.
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
        // Handle nested wildcard arrays.
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
        break;
      } else if (key) {
        // Continue traversal.
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
