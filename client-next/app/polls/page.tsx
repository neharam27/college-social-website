"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Layout from "@/components/Layout"
import PollCard, { Poll } from "@/components/PollCard"

export default function PollsPage() {
  const [polls,   setPolls]   = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<"all" | "active" | "closed">("all")

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    axios.get("http://localhost:5000/api/polls/all", { headers })
      .then(r => setPolls(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePollUpdate = (updated: Poll) =>
    setPolls(prev => prev.map(p => p.id === updated.id ? updated : p))

  const isExpired = (p: Poll) => p.ends_at ? new Date(p.ends_at) < new Date() : false

  const filtered = polls.filter(p => {
    const closed = p.status === "closed" || isExpired(p)
    if (filter === "active") return !closed
    if (filter === "closed") return closed
    return true
  })

  const Skeleton = () => (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse space-y-3">
      <div className="h-3 bg-slate-100 rounded w-1/4" />
      <div className="h-5 bg-slate-100 rounded w-3/4" />
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <Layout>
      <div className="animate-fadeInUp">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">🗳️ Polls</h1>
          <p className="text-slate-500 text-sm mt-1">Vote on what matters to your campus</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {(["all", "active", "closed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                filter === f
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f === "all" ? "All" : f === "active" ? "🟢 Active" : "⛔ Closed"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1,2,3,4].map(i => <Skeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mb-4 animate-float">
              🗳️
            </div>
            <p className="text-slate-700 font-semibold">No {filter !== "all" ? filter : ""} polls yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Club admins can create polls from the sidebar
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {filtered.length} poll{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filtered.map((poll, i) => (
                <div key={poll.id} className={`animate-fadeInUp delay-${Math.min(i * 50, 300)}`}>
                  <PollCard poll={poll} onPollUpdate={handlePollUpdate} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
