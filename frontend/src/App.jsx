import {BrowserRouter, Routes, Route} from "react-router-dom";
import TestBackend from "./pages/TestBackend"


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestBackend/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
