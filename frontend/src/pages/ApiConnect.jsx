import JsonTree from "../components/JsonTree";
import { useState } from "react";
import axios from "axios";
import "./styles.css";

export default function ApiConnect() {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState("{}");
  const [data, setData] = useState(null);
  const [mappedFields, setMappedFields] = useState([]);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    try {
      const parsedHeaders = JSON.parse(headers || "{}");
      const res = await axios.post("http://localhost:5000/api/test-api", {
        url,
        method,
        headers: parsedHeaders
      });
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setData(null);
    }
  };

  const handleSelectField = (path) => {
    if (!mappedFields.includes(path)) {
      setMappedFields(prev => [...prev, path]);
    }
  };

  return (
    <div>
      <h1>Connect API</h1>
      <input
        type="text"
        placeholder="API URL"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />
      <select value={method} onChange={e => setMethod(e.target.value)}>
        <option>GET</option>
        <option>POST</option>
      </select>
      <textarea
        placeholder="Headers JSON"
        value={headers}
        onChange={e => setHeaders(e.target.value)}
      />
      <button onClick={handleSubmit}>Test API</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div>
          <h2>API Response</h2>
          <JsonTree data={data} onSelect={handleSelectField} />
        </div>
      )}

      {mappedFields.length > 0 && (
        <div>
          <h2>Mapped Fields</h2>
          <ul>
            {mappedFields.map(field => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}