import React, { useState, useEffect } from "react";
import "./Modal.css";

export default function FieldValuesModal({ field, data, onClose }) {
  const [values, setValues] = useState([]);

  /**
   * Extracts displayable values for the selected mapped field.
   */
  useEffect(() => {
    if (data && field) {
      // Keep source metadata so users can trace each extracted value.
      const extractedValues = [];

      console.log("Modal data:", data);
      console.log("Looking for field:", field);

      data.forEach((point, pointIdx) => {
        console.log(
          `Point ${pointIdx} mappedFieldValues:`,
          point.mappedFieldValues,
        );
        if (point.mappedFieldValues && point.mappedFieldValues[field]) {
          const fieldValue = point.mappedFieldValues[field];
          const timestamp = new Date(point.timestamp).toLocaleString();

          if (Array.isArray(fieldValue)) {
            fieldValue.forEach((val, arrIdx) => {
              extractedValues.push({
                value: val,
                pointIndex: pointIdx,
                arrayIndex: arrIdx,
                timestamp,
                isArray: true,
              });
            });
          } else if (
            typeof fieldValue === "number" ||
            typeof fieldValue === "string"
          ) {
            extractedValues.push({
              value: fieldValue,
              pointIndex: pointIdx,
              timestamp,
              isArray: false,
            });
          }
        }
      });

      console.log("Extracted values:", extractedValues);
      setValues(extractedValues);
    }
  }, [field, data]);

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{field}</h3>
            <div className="modal-subtitle">
              {values.length} {values.length === 1 ? "value" : "values"}{" "}
              extracted
            </div>
          </div>

          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>

        {/* Values */}
        <div className="modal-values">
          {values.length === 0 ? (
            <div className="modal-empty">No values found</div>
          ) : (
            values.map((item, idx) => (
              <div key={idx} className="value-card">
                <div className="value-top">
                  <div className="value-text">
                    {typeof item.value === "number"
                      ? item.value
                      : String(item.value).slice(0, 30)}
                  </div>

                  {item.isArray && (
                    <div className="array-badge">[{item.arrayIndex}]</div>
                  )}
                </div>

                <div className="value-meta">
                  <div>Point #{item.pointIndex}</div>
                  <div>{item.timestamp}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="modal-btn modal-btn-close">
            Close
          </button>

          <button
            className="modal-btn modal-btn-export"
            onClick={() => {
              const csv = values.map((v) => v.value).join("\n");
              const blob = new Blob([csv], { type: "text/plain" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${field}_values.txt`;
              a.click();
            }}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
