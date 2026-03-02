import React from "react";

export default function JsonTree({ data, onSelect, path = "" }) {

  if (typeof data !== "object" || data === null) {
    const label = path.split(".").slice(-1)[0];
    return (
      <div className="json-item">
        <span className="json-key" onClick={() => onSelect(path)}>{label}</span>
        <span className="json-value">: {String(data)}</span>
      </div>
    );
  }

  return (
    <div>
      {Object.entries(data).map(([key, value]) => (
        <div className="json-item" key={key}>
          <div>
            <span className="json-key" onClick={() => onSelect(path ? `${path}.${key}` : key)}>{key}</span>
            {typeof value !== 'object' || value === null ? (
              <span className="json-value">: {String(value)}</span>
            ) : null}
          </div>
          {typeof value === 'object' && value !== null ? (
            <JsonTree data={value} path={path ? `${path}.${key}` : key} onSelect={onSelect} />
          ) : null}
        </div>
      ))}
    </div>
  );
}