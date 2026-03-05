import JsonTree from "../components/JsonTree";
import TrendGraph from "../components/TrendGraph";
import FieldValuesModal from "../components/FieldValuesModal";
import AutomationModal from "../components/AutomationModal";
import { useState, useEffect } from "react";
import axios from "axios";
import { auth } from "../services/firebase";
import "./styles.css";

export default function ApiConnect() {
  const [url, setUrl] = useState("");
  const [apiName, setApiName] = useState("");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState("{}");
  const [data, setData] = useState(null);
  const [mappedFields, setMappedFields] = useState([]);
  const [error, setError] = useState(null);
  const [currentApiId, setCurrentApiId] = useState(null);
  const [lastSaveStatus, setLastSaveStatus] = useState(null);
  const [selectedField, setSelectedField] = useState("");
  const [selectedField2, setSelectedField2] = useState("");
  const [chartType, setChartType] = useState("line");
  const [graphData, setGraphData] = useState(null);
  const [fieldTypes, setFieldTypes] = useState({});
  const [modalField, setModalField] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [savedApis, setSavedApis] = useState([]);
  const [runningJobs, setRunningJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  /**
   * Redirects unauthenticated users to the login page.
   */
  const checkIfLoggedIn = () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to use the API Console");
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    checkIfLoggedIn();
  }, []);

  /**
   * Sends a one-time API request without persisting the response.
   */
  const handleSubmit = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const parsedHeaders = JSON.parse(headers || "{}");

      const res = await axios.post(
        `${backendUrl}/api/execute-api`,
        {
          url,
          method,
          headers: parsedHeaders,
          apiConnectionId: currentApiId,
          mappedFields: mappedFields,
          saveData: false,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setData(res.data?.data || res.data);
      setError(null);
      setLastSaveStatus(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setData(null);
      setLastSaveStatus(null);
    }
  };

  /**
   * Persists the current response payload for the selected saved API.
   */
  const handleSaveData = async () => {
    if (!currentApiId || !data) {
      alert("Please test an API first and load a configuration");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const parsedHeaders = JSON.parse(headers || "{}");

      const res = await axios.post(
        `${backendUrl}/api/execute-api`,
        {
          url,
          method,
          headers: parsedHeaders,
          apiConnectionId: currentApiId,
          mappedFields: mappedFields,
          saveData: true,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.savedDataPoint) {
        setLastSaveStatus("✓ Data saved successfully!");
      } else {
        setLastSaveStatus("✓ Data saved!");
      }

      handlePlotGraph();
    } catch (err) {
      alert("Error saving data: " + (err.response?.data?.error || err.message));
    }
  };

  /**
   * Normalizes selected JSON paths so array index variations map to one key.
   *
   * Examples:
   * - 0.userId -> [*].userId
   * - users.0.name -> users[*].name
   * - users[0].name -> users[*].name
   */
  const normalizePath = (path) => {
    let normalized = path.replace(/\[\d+\]/g, "[*]");

    // Convert leading numeric segments.
    if (/^\d+\./.test(normalized)) {
      normalized = `[*].${normalized.replace(/^\d+\./, "")}`;
    }

    // Convert middle and trailing numeric segments.
    normalized = normalized.replace(/\.(\d+)\./g, "[*].");
    normalized = normalized.replace(/\.(\d+)$/g, "[*]");

    return normalized;
  };

  /**
   * Adds a selected JSON path to the mapped field list if not already present.
   */
  const handleSelectField = (path) => {
    const normalizedPath = normalizePath(path);

    if (!mappedFields.includes(normalizedPath)) {
      setMappedFields((prev) => [...prev, normalizedPath]);
    }
  };

  /**
   * Saves or updates the current API configuration.
   */
  const saveApi = async () => {
    if (!url) {
      alert("Please enter a URL first");
      return;
    }

    if (!apiName || apiName.trim() === "") {
      alert("Please enter a name for this API");
      return;
    }

    // Enforce max saved APIs only for new records.
    if (!currentApiId && savedApis.length >= 5) {
      alert(
        "You can save a maximum of 5 APIs. Please delete an existing one first.",
      );
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.post(
        `${backendUrl}/api/save-api`,
        {
          name: apiName.trim(),
          url,
          method,
          headers: JSON.parse(headers || "{}"),
          mappedFields,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCurrentApiId(res.data._id);
      setLastSaveStatus("✓ API saved: " + apiName);
      await fetchSavedApis();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Error saving API");
    }
  };

  /**
   * Loads a saved API config into the form and preloads trend data.
   */
  const loadApiById = async (apiId) => {
    if (!apiId) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(`${backendUrl}/api/user-apis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const found = (res.data || []).find((a) => a._id === apiId);

      if (found) {
        setUrl(found.url);
        setCurrentApiId(found._id);
        setApiName(found.name || "");
        setMethod(found.method || "GET");
        setHeaders(JSON.stringify(found.headers || {}));
        setMappedFields(found.mappedFields || []);
        setData(null);
        setError(null);
        setLastSaveStatus("✓ API loaded!");

        // Prefill graph inputs using the first available mapped field.
        const firstField = (found.mappedFields && found.mappedFields[0]) || "";
        setSelectedField(firstField);
        setSelectedField2("");

        if (firstField) {
          try {
            const token2 = await auth.currentUser.getIdToken();
            const dataRes = await axios.get(
              `${backendUrl}/api/api/${found._id}/unique-data`,
              { headers: { Authorization: `Bearer ${token2}` } },
            );
            const saved = dataRes.data || [];
            setGraphData(saved);
            if (saved.length > 0) {
              setData(
                saved[0].values || saved[0].mappedFieldValues || saved[0],
              );
            }
          } catch (err2) {
            console.error("Error loading saved data for graph:", err2);
          }
        } else {
          setGraphData([]);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error loading API");
    }
  };

  /**
   * Fetches all saved API configurations for the current user.
   */
  const fetchSavedApis = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(`${backendUrl}/api/user-apis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedApis(res.data || []);
    } catch (err) {
      console.error("Error fetching saved APIs:", err);
    }
  };

  /**
   * Fetches active automation jobs for the current user.
   */
  const fetchRunningJobs = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(`${backendUrl}/api/automation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRunningJobs(res.data?.jobs || []);
    } catch (err) {
      console.error("Error fetching running jobs:", err);
      setRunningJobs([]);
    }
  };

  const formatLastRun = (lastRun) => {
    if (!lastRun) return "Never";
    const parsedDate = new Date(lastRun);
    if (Number.isNaN(parsedDate.getTime())) return "Never";
    return parsedDate.toLocaleString();
  };

  /**
   * Detects mapped field data types from the latest saved payload.
   */
  const detectFieldTypes = async () => {
    if (!currentApiId) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(
        `${backendUrl}/api/api/${currentApiId}/unique-data`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const types = {};
      const sampleData = res.data && res.data[0];

      if (sampleData && sampleData.mappedFieldValues) {
        Object.entries(sampleData.mappedFieldValues).forEach(
          ([field, value]) => {
            if (Array.isArray(value)) {
              // Infer type from the first array entry when possible.
              types[field] = value.length > 0 ? typeof value[0] : "unknown";
            } else {
              types[field] = typeof value;
            }
          },
        );
      }

      setFieldTypes(types);
    } catch (err) {
      console.error("Error detecting field types:", err);
    }
  };

  /**
   * Refreshes detected field types whenever the selected API changes.
   */
  useEffect(() => {
    detectFieldTypes();
  }, [currentApiId]);

  /**
   * Loads initial API and automation state on mount.
   */
  useEffect(() => {
    fetchSavedApis();
    fetchRunningJobs();
  }, []);

  /**
   * Prevents selecting the same mapped field in both comparison slots.
   */
  useEffect(() => {
    if (selectedField2 === selectedField && selectedField) {
      setSelectedField2("");
    }
  }, [selectedField]);

  /**
   * Loads saved data points used by the trend chart.
   */
  const handlePlotGraph = async () => {
    if (!currentApiId || !selectedField) {
      alert("Please load an API and select at least one field");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(
        `${backendUrl}/api/api/${currentApiId}/unique-data`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setGraphData(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Error fetching graph data");
    }
  };

  /**
   * Opens the automation menu for the selected API.
   */
  const automateApi = async () => {
    if (!currentApiId) return;
    setShowModal(true);
  };

  /**
   * Creates or updates automation with the chosen interval.
   */
  const handleConfirmInterval = async (intervalMs) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const parsedHeaders = JSON.parse(headers || "{}");

      await axios.post(
        `${backendUrl}/api/automation`,
        {
          apiConnectionId: currentApiId,
          url,
          method,
          headers: parsedHeaders,
          mappedFields,
          intervalMs,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setError(null);
      await fetchRunningJobs();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    }
  };

  /**
   * Stops the active automation job for the selected API.
   */
  const handleStopAutomation = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const currentApi = savedApis.find((api) => api._id === currentApiId);
      const currentJob = currentApi ? runningJobsByUrl[currentApi.url] : null;

      if (!currentJob?._id) {
        return;
      }

      await axios.post(
        `${backendUrl}/api/automation/${currentJob._id}/stop`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setError(null);
      await fetchRunningJobs();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    }
  };

  const runningJobsByUrl = runningJobs.reduce((acc, job) => {
    acc[job.url] = job;
    return acc;
  }, {});

  const currentApi = savedApis.find((api) => api._id === currentApiId);
  const currentApiJob = currentApi ? runningJobsByUrl[currentApi.url] : null;

  /**
   * Source fields displayed in trend chart selectors.
   */
  const allMappedFields = mappedFields;

  /**
   * Opens the field-values modal for a mapped field.
   */
  const handleFieldClick = async (field) => {
    if (!currentApiId) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(
        `${backendUrl}/api/api/${currentApiId}/unique-data`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setModalField(field);
      setModalData(res.data || []);
    } catch (err) {
      console.error("Error fetching data for modal:", err);
      alert("Error loading field data");
    }
  };

  return (
    <div className="full-page">
      <div className="container">
        <div className="console">
          <div className="console-header">
            <div className="console-title">API Console</div>
            <div className="help">Test and save API connections</div>
          </div>

          <div className="console-body">
            <div className="panel">
              {currentApiId && (
                <div
                  style={{
                    padding: "0.5rem",
                    backgroundColor: "#0a5f0a",
                    borderRadius: "0.25rem",
                    marginBottom: "0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  ✓ API Config Loaded - Data saving enabled
                </div>
              )}

              <div className="form-row">
                <div className="form-label">Saved APIs</div>
                <select
                  className="select"
                  value={currentApiId || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      loadApiById(e.target.value);
                    } else {
                      setCurrentApiId(null);
                      setUrl("");
                      setHeaders("{}");
                      setMappedFields([]);
                      setData(null);
                      setApiName("");
                      setError(null);
                      setLastSaveStatus(null);
                    }
                  }}
                >
                  <option value="">Select or create new...</option>
                  {savedApis.map((api) => (
                    <option key={api._id} value={api._id}>
                      {api.name} ({api.dataCount || 0} data points)
                    </option>
                  ))}
                </select>
              </div>

              {savedApis.length > 0 && (
                <div className="running-jobs-panel">
                  <div className="help" style={{ marginBottom: "0.4rem" }}>
                    Running Jobs
                  </div>
                  {savedApis.map((api) => {
                    const job = runningJobsByUrl[api.url];
                    return (
                      <div key={`job-${api._id}`} className="running-job-row">
                        <div className="running-job-name" title={api.name}>
                          {api.name}
                        </div>
                        <div
                          className={`running-job-status ${job ? "running" : "stopped"}`}
                        >
                          {job ? "Running" : "Not running"}
                        </div>
                        <div className="running-job-last-run">
                          Last ran: {formatLastRun(job?.lastRun)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="form-row">
                <div className="form-label">API Name</div>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g., Weather API, Stock Prices"
                  value={apiName}
                  onChange={(e) => setApiName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-label">URL</div>
                <input
                  className="input"
                  type="text"
                  placeholder="https://api.example.com/data"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-label">Method</div>
                <select className="select" value={method} disabled>
                  <option>GET</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-label">Headers</div>
                <textarea
                  className="textarea"
                  placeholder='{"Authorization":"Bearer ..."}'
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                />
              </div>

              <div className="form-row toolbar" style={{ marginBottom: "0" }}>
                <button
                  className="btn btn-success"
                  onClick={handleSubmit}
                  title="Send request to the specified URL and show response"
                >
                  Send Request
                </button>
                <button
                  className="btn btn-success"
                  onClick={automateApi}
                  title="Open automation options for this API (start/update/stop)"
                >
                  Automation Menu
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setHeaders("{}");
                    setUrl("");
                    setMappedFields([]);
                    setData(null);
                    setError(null);
                    setLastSaveStatus(null);
                    setCurrentApiId(null);
                    setApiName("");
                  }}
                >
                  Reset
                </button>
                <button
                  className="btn btn-info"
                  onClick={handleSaveData}
                  title="Store the current response data based on mapped fields"
                >
                  Save Response Data
                </button>
                <button
                  className="btn btn-gold"
                  onClick={saveApi}
                  disabled={!currentApiId && savedApis.length >= 5}
                  title={
                    !currentApiId && savedApis.length >= 5
                      ? "Maximum 5 APIs reached. Delete one to add another."
                      : "Save or update the API configuration (URL + mapping)"
                  }
                  style={{
                    opacity: !currentApiId && savedApis.length >= 5 ? 0.5 : 1,
                    cursor:
                      !currentApiId && savedApis.length >= 5
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Save Configuration
                </button>
              </div>

              {error && <div className="error">{error}</div>}
              {lastSaveStatus && (
                <div
                  style={{
                    color: "#a8d5a8",
                    fontSize: "0.9rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {lastSaveStatus}
                </div>
              )}

              {mappedFields.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div className="help accent-gold">
                    Mapped Fields (click to view)
                  </div>
                  <div className="mapped-list">
                    {mappedFields.map((field) => (
                      <div
                        className="mapped-item"
                        key={field}
                        onClick={() => handleFieldClick(field)}
                        style={{
                          cursor: "pointer",
                          transition: "all 0.2s",
                          border: "0.065rem solid #222",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#1a1a1a";
                          e.target.style.borderColor = "#d4af37";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#0f0f10";
                          e.target.style.borderColor = "#222";
                        }}
                      >
                        {field}
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "#888",
                            marginTop: "0.25rem",
                            fontStyle: "italic",
                          }}
                        >
                          Click to view values →
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="panel">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <div className="help">API Response</div>
                <div className="help">Click keys to map</div>
              </div>

              <div className="response">
                {data ? (
                  <div className="json-tree">
                    <JsonTree data={data} onSelect={handleSelectField} />
                  </div>
                ) : (
                  <div className="help">
                    No response yet - test an API to see output.
                  </div>
                )}
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <div className="help" style={{ marginBottom: "0.5rem" }}>
                  Trends
                </div>
                <div className="trend-inputs">
                  <select
                    className="select"
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                  >
                    <option value="">Field 1</option>
                    {allMappedFields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                  <select
                    className="select"
                    value={selectedField2}
                    onChange={(e) => setSelectedField2(e.target.value)}
                  >
                    <option value="">Compare (optional)</option>
                    {allMappedFields
                      .filter((field) => field !== selectedField)
                      .map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                  </select>
                  <select
                    className="select"
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                  >
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                    <option value="scatter">Scatter</option>
                  </select>
                  <button className="btn btn-primary" onClick={handlePlotGraph}>
                    Plot
                  </button>
                </div>
                <div className="trend-graph-container">
                  <TrendGraph
                    data={graphData}
                    field={selectedField}
                    field2={selectedField2}
                    chartType={chartType}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalField && modalData && (
        <FieldValuesModal
          field={modalField}
          data={modalData}
          onClose={() => {
            setModalField(null);
            setModalData(null);
          }}
        />
      )}

      {showModal && (
        <AutomationModal
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmInterval}
          onStop={handleStopAutomation}
          existingJob={currentApiJob}
        />
      )}
    </div>
  );
}
