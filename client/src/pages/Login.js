import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

function Login() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleLogin = async () => {
    try {

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      )

      localStorage.setItem("token", res.data.token)
      navigate("/dashboard")

    } catch (err) {
      alert("Login failed")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">

      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md">

        <h2 className="text-3xl font-bold text-center text-indigo-600 mb-6">
          CollegeSocial Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-6 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-indigo-500 text-white py-3 rounded-lg hover:bg-indigo-600 transition"
        >
          Login
        </button>

      </div>

    </div>
  )
}

export default Login

