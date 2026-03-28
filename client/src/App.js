import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import CreatePost from "./pages/CreatePost"
import ClubPage from "./pages/ClubPage"
import { Toaster } from "react-hot-toast"

function App() {
  return (
    <>
      <Toaster position="top-right" />

      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/club/:clubId" element={<ClubPage />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
