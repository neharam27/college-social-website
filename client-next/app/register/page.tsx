"use client"

import { useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole]         = useState("student")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [success, setSuccess]   = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    if (!name || !email || !password) { setError("Please fill in all fields"); return }
    if (!email.endsWith("@college.edu")) { setError("Only @college.edu email addresses are allowed"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    if (!/[A-Z]/.test(password)) { setError("Password must contain at least one uppercase letter"); return }
    if (!/[0-9]/.test(password)) { setError("Password must contain at least one number"); return }
    setLoading(true); setError("")
    try {
      await axios.post("http://localhost:5000/api/auth/register", { name, email, password, role })
      setSuccess(true)
      setTimeout(() => router.push("/"), 3000)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data
        if (data?.errors?.length) {
          setError(data.errors.map((e: { message: string }) => e.message).join(" · "))
        } else if (data?.message) {
          setError(data.message)
        } else {
          setError("Registration failed. Please try again.")
        }
      } else {
        setError("Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg flex items-center justify-center min-h-screen p-4">
      <div className="absolute top-20 right-20 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md animate-fadeInUp">
        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-xl">
              CS
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">Create account</h1>
          <p className="text-slate-500 text-sm text-center mb-8">Join CollegeSocial today</p>

          {success && (
            <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
              <span>✅</span><span>Account created! Redirecting to login…</span>
            </div>
          )}
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                placeholder="Jane Doe"
                className="input-primary w-full px-4 py-3 border border-slate-200 rounded-xl bg-white/80 text-slate-900 text-sm"
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                placeholder="you@college.edu"
                className="input-primary w-full px-4 py-3 border border-slate-200 rounded-xl bg-white/80 text-slate-900 text-sm"
                onChange={e => setEmail(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Must end with <strong>@college.edu</strong></p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                className="input-primary w-full px-4 py-3 border border-slate-200 rounded-xl bg-white/80 text-slate-900 text-sm"
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">I am a…</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: "student",    icon: "🎓", label: "Student" },
                  { val: "club_admin", icon: "🏛️", label: "Club Admin" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setRole(opt.val)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
                      role === opt.val
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white/60 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleRegister}
            disabled={loading || success}
            className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-violet-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : "Create Account →"}
          </button>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link href="/" className="text-indigo-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
