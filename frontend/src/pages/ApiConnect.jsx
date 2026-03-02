import JsonTree from "../components/JsonTree";
import TrendGraph from "../components/TrendGraph";
import FieldValuesModal from "../components/FieldValuesModal";
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

  // Check if user is logged in, if not redirect
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

  // Test API call
  const handleSubmit = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const parsedHeaders = JSON.parse(headers || "{}");

      const res = await axios.post(
        "http://localhost:5000/api/test-api",
        { 
          url, 
          method, 
          headers: parsedHeaders,
          apiConnectionId: currentApiId,
          mappedFields: mappedFields,
          saveData: false,
        },
        { headers: { Authorization: `Bearer ${token}` } }
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

  // Save current data from mapped fields
  const handleSaveData = async () => {
    if (!currentApiId || !data) {
      alert("Please test an API first and load a configuration");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const parsedHeaders = JSON.parse(headers || "{}");

      const res = await axios.post(
        "http://localhost:5000/api/test-api",
        { 
          url, 
          method, 
          headers: parsedHeaders,
          apiConnectionId: currentApiId,
          mappedFields: mappedFields,
          saveData: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.isDuplicate) {
        setLastSaveStatus("Duplicate data detected — not saved");
      } else if (res.data?.savedDataPoint) {
        setLastSaveStatus("✓ Data saved successfully!");
      } else {
        setLastSaveStatus("✓ Data saved!");
      }
    } catch (err) {
      alert("Error saving data: " + (err.response?.data?.error || err.message));
    }
  };

  // Normalize paths - convert array indices to [*] pattern
  // Handles both 0.userId (dot notation) and [0].userId (bracket notation)
  const normalizePath = (path) => {
    let normalized = path.replace(/\[\d+\]/g, "[*]");
    
    // Leading numbers: "0.userId" → "[*].userId"
    if (/^\d+\./.test(normalized)) {
      normalized = `[*].${normalized.replace(/^\d+\./, "")}`;
    }
    
    // Middle/trailing: "users.0.name" → "users[*].name" or "users.0" → "users[*]"
    normalized = normalized.replace(/\.(\d+)\./g, "[*].");
    normalized = normalized.replace(/\.(\d+)$/g, "[*]");
    
    return normalized;
  };

  // Map JSON fields
  const handleSelectField = (path) => {
    const normalizedPath = normalizePath(path);
    
    if (!mappedFields.includes(normalizedPath)) {
      setMappedFields((prev) => [...prev, normalizedPath]);
    }
  };

  // Save API configuration (URL + field mappings)
  const saveApi = async () => {
    if (!url) {
      alert("Please enter a URL first");
      return;
    }

    if (!apiName || apiName.trim() === "") {
      alert("Please enter a name for this API");
      return;
    }

    // Check 5 API limit (only if creating new)
    if (!currentApiId && savedApis.length >= 5) {
      alert("You can save a maximum of 5 APIs. Please delete an existing one first.");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.post(
        "http://localhost:5000/api/save-api",
        {
          name: apiName.trim(),
          url,
          method,
          headers: JSON.parse(headers || "{}"),
          mappedFields,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentApiId(res.data._id);
      setLastSaveStatus("✓ API saved: " + apiName);
      await fetchSavedApis();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Error saving API");
    }
  };

  // Load saved API settings for current URL
  const loadApi = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get("http://localhost:5000/api/user-apis", { headers: { Authorization: `Bearer ${token}` } });
      const found = (res.data || []).find(a => String(a.url).trim() === String(url).trim());
      if (found) {
        setCurrentApiId(found._id);
        setApiName(found.name || "");
        setMethod(found.method || "GET");
        setHeaders(JSON.stringify(found.headers || {}));
        setMappedFields(found.mappedFields || []);
        setData(null);
        setError(null);
        setLastSaveStatus("✓ API settings loaded!");

        // automatically choose first mapped field and load its data
        const firstField = (found.mappedFields && found.mappedFields[0]) || "";
        setSelectedField(firstField);
        setSelectedField2("");

        if (firstField) {
          try {
            const token2 = await auth.currentUser.getIdToken();
            const dataRes = await axios.get(
              `http://localhost:5000/api/api/${found._id}/unique-data`,
              { headers: { Authorization: `Bearer ${token2}` } }
            );
            const saved = dataRes.data || [];
            setGraphData(saved);
            if (saved.length > 0) {
              setData(saved[0].values || saved[0].mappedFieldValues || saved[0]);
            }
          } catch (err2) {
            console.error("Error loading saved data for graph:", err2);
          }
        } else {
          setGraphData([]);
        }
      } else {
        alert("No saved API found for this URL");
      }
    } catch (err) {
      console.error(err);
      alert("Error loading saved APIs");
    }
  };

  // Load API by ID from dropdown
  const loadApiById = async (apiId) => {
    if (!apiId) return;
    
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get("http://localhost:5000/api/user-apis", { headers: { Authorization: `Bearer ${token}` } });
      const found = (res.data || []).find(a => a._id === apiId);
      
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

        // auto-select first mapped field and load its saved data
        const firstField = (found.mappedFields && found.mappedFields[0]) || "";
        setSelectedField(firstField);
        setSelectedField2("");

        if (firstField) {
          try {
            const token2 = await auth.currentUser.getIdToken();
            const dataRes = await axios.get(
              `http://localhost:5000/api/api/${found._id}/unique-data`,
              { headers: { Authorization: `Bearer ${token2}` } }
            );
            const saved = dataRes.data || [];
            setGraphData(saved);
            if (saved.length > 0) {
              setData(saved[0].values || saved[0].mappedFieldValues || saved[0]);
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

  // Fetch all saved APIs
  const fetchSavedApis = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get("http://localhost:5000/api/user-apis", { headers: { Authorization: `Bearer ${token}` } });
      setSavedApis(res.data || []);
    } catch (err) {
      console.error("Error fetching saved APIs:", err);
    }
  };

  // Detect data types of fields from saved data
  const detectFieldTypes = async () => {
    if (!currentApiId) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(
        `http://localhost:5000/api/api/${currentApiId}/unique-data`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const types = {};
      const sampleData = res.data && res.data[0];

      if (sampleData && sampleData.mappedFieldValues) {
        Object.entries(sampleData.mappedFieldValues).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            // For arrays, check the type of first element
            types[field] = value.length > 0 ? typeof value[0] : "unknown";
          } else {
            types[field] = typeof value;
          }
        });
      }

      setFieldTypes(types);
    } catch (err) {
      console.error("Error detecting field types:", err);
    }
  };

  // Call detectFieldTypes when currentApiId changes
  useEffect(() => {
    detectFieldTypes();
  }, [currentApiId]);

  // Fetch saved APIs on component mount
  useEffect(() => {
    fetchSavedApis();
  }, []);

  // Auto-clear field2 if it matches field1
  useEffect(() => {
    if (selectedField2 === selectedField && selectedField) {
      setSelectedField2("");
    }
  }, [selectedField]);

  // Fetch and plot saved data
  const handlePlotGraph = async () => {
    if (!currentApiId || !selectedField) {
      alert("Please load an API and select at least one field");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(
        `http://localhost:5000/api/api/${currentApiId}/unique-data`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGraphData(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Error fetching graph data");
    }
  };

  // Get all mapped fields for trend graphs
  // This allows users to save any field's value over time
  const allMappedFields = mappedFields;

  // Handle field click to show model
  const handleFieldClick = async (field) => {
    if (!currentApiId) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.get(
        `http://localhost:5000/api/api/${currentApiId}/unique-data`,
        { headers: { Authorization: `Bearer ${token}` } }
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
                <div style={{ padding: "0.5rem", backgroundColor: "#0a5f0a", borderRadius: "0.25rem", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                  ✓ API Config Loaded — Data saving enabled
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
                <select
                  className="select"
                  value={method}
                  disabled
                >
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
                <button className="btn btn-success" onClick={handleSubmit} title="Send request to the specified URL and show response">
                  Send Request
                </button>
                <button className="btn btn-primary" onClick={loadApi} title="Load a saved API configuration based on the URL">
                  Load Config
                </button>
                <button className="btn btn-danger" onClick={() => { setHeaders("{}"); setUrl(""); setMappedFields([]); setData(null); setError(null); setLastSaveStatus(null); setCurrentApiId(null); setApiName(""); }}>
                  Reset
                </button>
                <div style={{ flex: 1 }} />
                <button className="btn btn-info" onClick={handleSaveData} title="Store the current response data based on mapped fields">
                  Save Response Data
                </button>
                <button 
                  className="btn btn-gold" 
                  onClick={saveApi}
                  disabled={!currentApiId && savedApis.length >= 5}
                  title={!currentApiId && savedApis.length >= 5 ? "Maximum 5 APIs reached. Delete one to add another." : "Save or update the API configuration (URL + mapping)"}
                  style={{
                    opacity: (!currentApiId && savedApis.length >= 5) ? 0.5 : 1,
                    cursor: (!currentApiId && savedApis.length >= 5) ? "not-allowed" : "pointer"
                  }}
                >
                  Save Configuration
                </button>
              </div>

              {error && <div className="error">{error}</div>}
              {lastSaveStatus && <div style={{ color: "#a8d5a8", fontSize: "0.9rem", marginTop: "0.5rem" }}>{lastSaveStatus}</div>}

              {mappedFields.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div className="help accent-gold">Mapped Fields (click to view)</div>
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
                        <div style={{ 
                          fontSize: "0.65rem", 
                          color: "#888", 
                          marginTop: "0.25rem",
                          fontStyle: "italic"
                        }}>
                          Click to view values →
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div className="help">API Response</div>
                <div className="help">Click keys to map</div>
              </div>

              <div className="response">
                {data ? (
                  <div className="json-tree">
                    <JsonTree data={data} onSelect={handleSelectField} />
                  </div>
                ) : (
                  <div className="help">No response yet — test an API to see output.</div>
                )}
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <div className="help" style={{ marginBottom: "0.5rem" }}>Trends</div>
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
                    {allMappedFields.filter((field) => field !== selectedField).map((field) => (
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
                  <button className="btn btn-primary" onClick={handlePlotGraph}>Plot</button>
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

      {/* Field Values Modal */}
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
    </div>
  );
}