"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import Layout from "@/components/Layout"
import { toast } from "react-hot-toast"

export default function CreatePollPage() {
  const [question,   setQuestion]   = useState("")
  const [options,    setOptions]    = useState(["", ""])
  const [endsAt,     setEndsAt]     = useState("")
  const [anonymous,  setAnonymous]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [role,       setRole]       = useState("")
  const router = useRouter()

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user")
      if (saved) setRole(JSON.parse(saved).role || "")
    } catch { /* ignore */ }
  }, [])

  // Guard: non-admin shouldn't be here
  if (role && role !== "club_admin" && role !== "superadmin") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-slate-700 font-semibold">Club admins only</p>
          <p className="text-slate-400 text-sm mt-1">You need a club admin account to create polls.</p>
        </div>
      </Layout>
    )
  }

  const addOption = () => {
    if (options.length >= 6) return toast.error("Maximum 6 options")
    setOptions(prev => [...prev, ""])
  }

  const removeOption = (i: number) => {
    if (options.length <= 2) return toast.error("Minimum 2 options required")
    setOptions(prev => prev.filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, val: string) =>
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return toast.error("Question is required")
    const cleanOpts = options.map(o => o.trim()).filter(Boolean)
    if (cleanOpts.length < 2) return toast.error("At least 2 non-empty options required")

    setSubmitting(true)
    try {
      await api.post("/polls/create", {
        question: question.trim(),
        options: cleanOpts,
        is_anonymous: anonymous,
        ends_at: endsAt || null
      })
      toast.success("Poll created! 🗳️")
      router.push("/polls")
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Failed to create poll")
    } finally {
      setSubmitting(false)
    }
  }

  // Min date: today
  const minDate = new Date()
  minDate.setMinutes(minDate.getMinutes() + 30)
  const minDateStr = minDate.toISOString().slice(0, 16)

  return (
    <Layout>
      <div className="max-w-xl animate-fadeInUp">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">🗳️ Create a Poll</h1>
          <p className="text-slate-500 text-sm mt-1">Ask your club followers anything</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2 shadow-sm">
            <label className="text-sm font-semibold text-slate-700">
              Question <span className="text-red-400">*</span>
            </label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="What do you want to ask your followers?"
              rows={3}
              maxLength={500}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none transition-all"
            />
            <p className="text-xs text-slate-400 text-right">{question.length}/500</p>
          </div>

          {/* Options */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Options <span className="text-slate-400 font-normal">(2–6)</span>
              </label>
              <button
                type="button"
                onClick={addOption}
                disabled={options.length >= 6}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-40 transition-colors"
              >
                + Add option
              </button>
            </div>

            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 animate-fadeInUp">
                  <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    maxLength={255}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <label className="text-sm font-semibold text-slate-700">Settings</label>

            {/* End date */}
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium">End date & time (optional)</label>
              <input
                type="datetime-local"
                value={endsAt}
                min={minDateStr}
                onChange={e => setEndsAt(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              />
              <p className="text-xs text-slate-400">Leave empty for no time limit</p>
            </div>

            {/* Anonymous toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-slate-700">Anonymous votes</p>
                <p className="text-xs text-slate-400">Vote counts shown, but not who voted</p>
              </div>
              <button
                type="button"
                onClick={() => setAnonymous(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  anonymous ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                  anonymous ? "left-6" : "left-1"
                }`} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !question.trim()}
            className="w-full btn-gradient py-3 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating poll…" : "🗳️ Create Poll"}
          </button>
        </form>
      </div>
    </Layout>
  )
}
