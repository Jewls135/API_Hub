import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import TestBackend from "./pages/TestBackend";
import Login from "./pages/Login";
import ApiConnect from "./pages/ApiConnect";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      {/* Navbar outside the content container */}
      <header className="navbar">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          Home
        </NavLink>
        <NavLink
          to="/login"
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          Login
        </NavLink>
        <NavLink
          to="/connect-api"
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          Connect API
        </NavLink>
      </header>

      {/* Content container */}
      <main className="content">
        <Routes>
          <Route path="/" element={<TestBackend />} />
          <Route path="/login" element={<Login />} />
          <Route path="/connect-api" element={<ApiConnect />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;