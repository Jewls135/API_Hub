import React from "react";

export default function JsonTree({ data, onSelect, path = "" }) {

  if (typeof data !== "object" || data === null) {
    // Base case: primitive value
    return (
      <div style={{ paddingLeft: "20px" }}>
        <span onClick={() => onSelect(path)}>
          {path.split(".").slice(-1)[0]}: {String(data)}
        </span>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: "10px" }}>
      {Object.entries(data).map(([key, value]) => (
        <JsonTree
          key={key}
          data={value}
          path={path ? `${path}.${key}` : key}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}