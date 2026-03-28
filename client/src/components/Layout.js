import { useNavigate } from "react-router-dom"
import { useState } from "react"

function Layout({ children }) {

  const navigate = useNavigate()
  const [dark, setDark] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("token")
    navigate("/")
  }

  return (
    <div className={dark ? "min-h-screen bg-gray-900 text-white" : "min-h-screen bg-gray-100 text-black"}>

      {/* NAVBAR */}
      <nav className={dark
        ? "bg-gray-800 shadow-lg px-8 py-4 flex justify-between items-center sticky top-0 z-50"
        : "bg-white shadow-lg px-8 py-4 flex justify-between items-center sticky top-0 z-50"
      }>

        <h1 className="text-2xl font-bold text-indigo-500">
          CollegeSocial 🚀
        </h1>

        <div className="space-x-4">

          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            Dashboard
          </button>

          <button
            onClick={() => navigate("/create-post")}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Create Post
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>

          {/* DARK MODE BUTTON */}
          <button
            onClick={() => setDark(!dark)}
            className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-900 transition"
          >
            {dark ? "Light 🌞" : "Dark 🌙"}
          </button>

        </div>
      </nav>

      {/* PAGE CONTENT */}
      <div className="p-8">
        {children}
      </div>

    </div>
  )
}

export default Layout