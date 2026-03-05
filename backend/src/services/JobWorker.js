import axios from "axios";
import ApiJobs from "../models/ApiJob.js";
import ApiDataPoint from "../models/ApiDataPoint.js";
import ApiConnection from "../models/ApiConnection.js";

/**
 * JobWorker loop structure
 * Every loop checks whether individual jobs are due based on intervalMs.
 */
const JOB_LOOP_INTERVAL_MS = 60 * 1000 * 5;

const JobWorker = setInterval(async () => {
  const now = new Date();
  try {
    const jobs = await ApiJobs.find({ active: { $ne: false } });

    for (const job of jobs) {
      const intervalMs =
        job.intervalMs || (job.intervalSecs ? job.intervalSecs * 1000 : null);

      if (!intervalMs) {
        continue;
      }

      if (!job.lastRun || now - job.lastRun >= intervalMs) {
        try {
          let apiConnectionId = job.apiConnectionId;

          if (!apiConnectionId) {
            const matchedApi = await ApiConnection.findOne({
              userId: job.userId,
              url: job.url,
            }).select("_id mappedFields");

            if (!matchedApi?._id) {
              continue;
            }

            apiConnectionId = matchedApi._id;
            job.apiConnectionId = matchedApi._id;

            if (
              (!job.mappedFields || job.mappedFields.length === 0) &&
              matchedApi.mappedFields
            ) {
              job.mappedFields = matchedApi.mappedFields;
            }
          }

          const response = await axios({
            url: job.url,
            method: job.method || "GET",
            headers: job.headers || {},
          });

          let valuesToStore = response.data;
          let mappedFieldValues = {};

          if (Array.isArray(job.mappedFields) && job.mappedFields.length > 0) {
            const tempDataPoint = new ApiDataPoint({ values: response.data });
            mappedFieldValues = tempDataPoint.extractMappedValues(
              job.mappedFields,
            );

            if (Object.keys(mappedFieldValues).length > 0) {
              valuesToStore = mappedFieldValues;
            }
          }

          // Save new data for this API connection.
          const dataPoint = new ApiDataPoint({
            apiConnectionId,
            userId: job.userId,
            values: valuesToStore,
            mappedFieldValues,
          });

          await dataPoint.save();

          // Keep timestamp after a successful save.
          job.lastRun = new Date();
          await job.save();
        } catch (err) {
          console.error(`Job failed for ${job.url}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Error in job loop:", err.message);
  }
}, JOB_LOOP_INTERVAL_MS);

export default JobWorker;
