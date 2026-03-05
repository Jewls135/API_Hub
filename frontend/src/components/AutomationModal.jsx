import { useState } from "react";
import "./Modal.css";

export default function AutomationModal({
  onClose,
  onConfirm,
  onStop,
  existingJob,
}) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5); // Default 5 minutes baseline if no input

  const handleConfirm = async () => {
    const totalMinutes = hours * 60 + minutes;
    const intervalMs = totalMinutes * 60 * 1000;
    try {
      await onConfirm(intervalMs);
      onClose();
    } catch {
      
    }
  };

  const handleStop = async () => {
    if (!onStop) return;

    try {
      await onStop();
      onClose();
    } catch {
      
    }
  };

 
  const hourOptions = [];
  for (let h = 0; h <= 24; h++) hourOptions.push(h);

  const minuteOptions = [];
  for (let m = 0; m <= 55; m += 5) minuteOptions.push(m);

  const allowedMinutes = hours === 24 ? [0] : minuteOptions;

  return (
    <div className="modal-overlay">
      <div className="modal-container small-modal">
        <div className="modal-header">
          <h3 className="modal-title">Automation Menu</h3>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>

        <div className="automation-subtitle">
          {existingJob
            ? "An automation job is already active for this API."
            : "Choose how often this API should run."}
        </div>

        <div className="modal-values automation-values">
          <label className="automation-label">Interval</label>
          <div className="automation-input-row">
            <select
              className="automation-select"
              value={hours}
              onChange={(e) => {
                const h = Number(e.target.value);
                setHours(h);
                if (h === 24) setMinutes(0); 
              }}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {h} hr
                </option>
              ))}
            </select>

            <select
              className="automation-select"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {allowedMinutes.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
          <div className="automation-preview">
            Runs every {hours}h {minutes}m
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={handleConfirm}
            className="modal-btn modal-btn-confirm"
          >
            Start / Update Automation
          </button>
          {existingJob && onStop && (
            <button onClick={handleStop} className="modal-btn modal-btn-stop">
              Stop Automation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
