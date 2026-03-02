import React from "react";
import {
  LineChart,
  BarChart,
  ScatterChart,
  Line,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../pages/styles.css";

export default function TrendGraph({
  data = null,
  field = null,
  field2 = null,
  chartType = "line",
}) {
  if (!data || !field || data.length === 0) {
    return (
      <div className="trend-graph-container">
        <div className="help" style={{ textAlign: "center", padding: "2rem" }}>
          Select field and click Plot to display graph
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = prepareChartData(data, field, field2);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="trend-graph-container">
        <div className="help" style={{ textAlign: "center", padding: "2rem" }}>
          <p>
            No data available for field: <strong>{field}</strong>
          </p>
          <p style={{ fontSize: "0.8rem", marginTop: "1rem", color: "#666" }}>
            Check browser console for details.
          </p>
        </div>
      </div>
    );
  }

  // Determine field types
  const fieldType = chartData[0]?.fieldType;
  const field2Type = chartData[0]?.field2Type;

  // For string fields, only show bar chart
  if (fieldType === "string") {
    console.log("Rendering string field bar chart");
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#888" }} />
            <YAxis tick={{ fontSize: 12, fill: "#888" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "4px",
              }}
              labelStyle={{ color: "#e0e0e0" }}
            />
            <Legend />
            <Bar dataKey={field} fill="#1e90ff" name={field} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // For numeric fields, support all chart types
  console.log("Rendering numeric field chart, type:", chartType);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "line" && (
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#888" }} />
            <YAxis tick={{ fontSize: 12, fill: "#888" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "4px",
              }}
              labelStyle={{ color: "#e0e0e0" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={field}
              stroke="#1e90ff"
              dot={false}
              name={field}
            />
            {field2 && (
              <Line
                type="monotone"
                dataKey={field2}
                stroke="#ffa500"
                dot={false}
                name={field2}
              />
            )}
          </LineChart>
        )}

        {chartType === "bar" && (
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#888" }} />
            <YAxis tick={{ fontSize: 12, fill: "#888" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "4px",
              }}
              labelStyle={{ color: "#e0e0e0" }}
            />
            <Legend />
            <Bar dataKey={field} fill="#1e90ff" name={field} />
            {field2 && <Bar dataKey={field2} fill="#ffa500" name={field2} />}
          </BarChart>
        )}

        {chartType === "scatter" && (
          <ScatterChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey={field}
              name={field}
              tick={{ fontSize: 12, fill: "#888" }}
            />
            <YAxis
              dataKey={field2}
              name={field2}
              tick={{ fontSize: 12, fill: "#888" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "4px",
              }}
              labelStyle={{ color: "#e0e0e0" }}
              cursor={{ fill: "rgba(0,0,0,0.1)" }}
            />
            <Scatter
              name={field2 ? `${field} vs ${field2}` : field}
              data={chartData}
              fill="#1e90ff"
            />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function prepareChartData(data, field, field2) {
  // Dynamic time formatting for graph
  const timestamps = data
    .map((p) => new Date(p.timestamp))
    .filter((d) => !isNaN(d));

  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeSpan = maxTime - minTime;

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const ONE_MONTH = 30 * ONE_DAY;

  const formatTime = (ts) => {
    const date = new Date(ts);

    if (timeSpan <= ONE_DAY) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (timeSpan <= ONE_MONTH) {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!data || data.length === 0) {
    console.log("No data provided to prepareChartData");
    return [];
  }

  console.log("prepareChartData - data:", data);
  console.log("prepareChartData - field:", field);
  console.log("prepareChartData - field2:", field2);

  // Determine the data type for each field
  let fieldType = null;
  let field2Type = null;

  // Analyze first value to determine type
  for (let point of data) {
    console.log("Checking point:", point);
    if (
      point.mappedFieldValues &&
      point.mappedFieldValues[field] !== undefined
    ) {
      const val = point.mappedFieldValues[field];
      console.log(`Found field value: ${field} =`, val, "type:", typeof val);
      if (typeof val === "number") fieldType = "number";
      else if (typeof val === "string") fieldType = "string";
      break;
    }
  }

  if (!fieldType) {
    console.log("No valid field type found for:", field);
  }

  if (field2) {
    for (let point of data) {
      if (
        point.mappedFieldValues &&
        point.mappedFieldValues[field2] !== undefined
      ) {
        const val = point.mappedFieldValues[field2];
        if (typeof val === "number") field2Type = "number";
        else if (typeof val === "string") field2Type = "string";
        break;
      }
    }
  }

  // If string field, count occurrences
  if (fieldType === "string") {
    console.log("String field detected, counting occurrences");
    const counts = {};
    data.forEach((point) => {
      if (point.mappedFieldValues && point.mappedFieldValues[field]) {
        const val = String(point.mappedFieldValues[field]);
        counts[val] = (counts[val] || 0) + 1;
      }
    });

    console.log("String counts:", counts);
    return Object.entries(counts).map(([name, count]) => ({
      name,
      [field]: count,
      fieldType: "string",
      field2Type: null,
    }));
  }

  // For numeric fields
  console.log("Numeric field detected, preparing data");
  const result = data
    .map((point, idx) => {
      const obj = {
        time: formatTime(point.timestamp),
        [field]: null,
        fieldType: fieldType,
        field2Type: field2Type,
      };

      // Extract field value
      if (
        point.mappedFieldValues &&
        point.mappedFieldValues[field] !== undefined
      ) {
        const val = point.mappedFieldValues[field];
        obj[field] = typeof val === "number" ? val : Number(val);
      }

      // Extract field2 value if provided
      if (
        field2 &&
        point.mappedFieldValues &&
        point.mappedFieldValues[field2] !== undefined
      ) {
        const val = point.mappedFieldValues[field2];
        obj[field2] = typeof val === "number" ? val : Number(val);
      }

      return obj;
    })
    .filter((item) => item[field] !== null)
    .reverse();

  console.log("Final chart data:", result);
  return result;
}
