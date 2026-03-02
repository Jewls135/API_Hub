import "./styles.css";
import previewImg from "/src/API_Console_Preview.png";

export default function Home() {
  return (
    <div className="full-page">
      <div className="container">
        <div className="console">
          {/* header */}
          <div className="console-header">
            <span className="console-title">API Hub — Documentation</span>
          </div>

          {/* main content */}
          <div className="console-body" style={{ gridTemplateColumns: "1fr" }}>
            <div className="panel">
              {/* INTRO */}
              <div className="section">
                <div className="section-title">Welcome to API Hub</div>

                <p className="help">
                  API Hub is a platform designed to simplify how developers
                  connect to, explore, and work with data from external APIs.
                </p>

                <div
                  className="response"
                  style={{
                    minHeight: "220px",
                    overflow: "visible",
                  }}
                >
                  <strong>Platform Overview</strong>

                  <p>
                    API Hub provides a centralized environment for connecting
                    external APIs, sending requests, and visualizing returned
                    data in a structured and readable format. Developers can
                    quickly inspect responses, understand complex JSON
                    structures, and record and map important data fields without needing
                    multiple external tools.
                  </p>

                  <p>
                    Future updates will include additions to the dashboard
                    interface regarding automation, algorithms behind data parsing,
                    and improvements to the visualization/interaction with mapped data
                  </p>
                </div>
              </div>

              {/* QUICK START */}
              <div className="section">
                <div className="section-title">Quick Start Guide</div>

                <ul className="mapped-list">
                  <li className="mapped-item">1. Login to your account</li>
                  <li className="mapped-item">2. Navigate to API Connect</li>
                  <li className="mapped-item">3. Add an API endpoint</li>
                  <li className="mapped-item">4. Send a request</li>
                  <li className="mapped-item">5. Map response data</li>
                </ul>
              </div>

              {/* SCREENSHOT */}
              <div className="section">
                <div className="section-title">Interface Overview</div>

                <img
                  src={previewImg}
                  alt="API Hub Screenshot"
                  style={{
                    width: "100%",
                    borderRadius: "6px",
                    border: "1px solid #222",
                  }}
                />
              </div>

              {/* GITHUB */}
              <div className="section">
                <div className="section-title">Project Repository</div>

                <a
                  href="https://github.com/Jewls135/API_Hub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mapped-item"
                >
                  View API Hub on GitHub
                </a>
              </div>

              {/* AUTHOR */}
              <div className="section">
                <div
                  style={{
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  Built by <strong>Julian Ward</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
