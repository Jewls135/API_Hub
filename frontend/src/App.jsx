import {BrowserRouter, Routes, Route} from "react-router-dom";
import TestBackend from "./pages/TestBackend"
import Login from "./pages/Login"


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestBackend/>} />
        <Route path="/login" element={<Login/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
