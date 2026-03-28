import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

function Navbar() {
  const navigate = useNavigate()
  const [role, setRole] = useState("")

  const handleLogout = () => {
    localStorage.removeItem("token")
    navigate("/")
  }

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setRole(payload.role)
    }
  }, [])

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#333",
      color: "white",
      padding: "10px 20px"
    }}>
      <h2>College Social</h2>

      <div>
        <button onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>

        {role === "club_admin" && (
          <button onClick={() => navigate("/create-post")}>
            Create Post
          </button>
        )}

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  )
}

export default Navbar
