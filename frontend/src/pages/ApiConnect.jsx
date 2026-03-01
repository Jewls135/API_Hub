import { useState } from "react";
import axios from "axios";
import "./styles.css";

export default function ApiConnect() {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState("{}");
  const [data, setData] = useState(null);
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
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}