"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow, isPast } from "date-fns"
import api from "@/lib/api"
import { toast } from "react-hot-toast"

export interface PollOption {
  id: number
  poll_id: number
  option_text: string
  display_order: number
  vote_count: number
}

export interface Poll {
  id: number
  club_id: number
  club_name: string
  question: string
  is_anonymous: number
  ends_at: string | null
  status: "active" | "closed" | "deleted"
  created_at: string
  total_votes: number
  user_voted_option: number | null
  options: PollOption[]
}

interface PollCardProps {
  poll: Poll
  onPollUpdate?: (updated: Poll) => void
  compact?: boolean
}

export default function PollCard({ poll: initialPoll, onPollUpdate, compact = false }: PollCardProps) {
  const [poll,    setPoll]    = useState<Poll>(initialPoll)
  const [voting,  setVoting]  = useState<number | null>(null)
  const router = useRouter()

  const isExpired = poll.ends_at ? isPast(new Date(poll.ends_at)) : false
  const isClosed  = poll.status === "closed" || isExpired
  const hasVoted  = poll.user_voted_option !== null
  const total     = poll.options.reduce((s, o) => s + Number(o.vote_count), 0)

  const getPct = (count: number) =>
    total === 0 ? 0 : Math.round((Number(count) / total) * 100)

  const handleVote = async (optionId: number) => {
    if (isClosed) return toast.error("This poll has ended")
    if (voting !== null) return

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return toast.error("Login to vote")

    setVoting(optionId)
    const prevPoll = { ...poll, options: poll.options.map(o => ({ ...o })) }
    const wasSame  = poll.user_voted_option === optionId

    // Optimistic update
    setPoll(prev => {
      const opts = prev.options.map(o => {
        if (o.id === optionId)           return { ...o, vote_count: o.vote_count + (wasSame ? -1 : 1) }
        if (o.id === prev.user_voted_option) return { ...o, vote_count: Math.max(0, o.vote_count - 1) }
        return o
      })
      const newVoted = wasSame ? null : optionId
      const newTotal = opts.reduce((s, o) => s + Number(o.vote_count), 0)
      const updated = { ...prev, options: opts, user_voted_option: newVoted, total_votes: newTotal }
      onPollUpdate?.(updated)
      return updated
    })

    try {
      await api.post("/polls/vote", { poll_id: poll.id, option_id: optionId })
      if (wasSame) toast("Vote removed", { icon: "🗳️" })
      else toast.success("Vote recorded! 🗳️")
    } catch (e: unknown) {
      // Revert
      setPoll(prevPoll)
      onPollUpdate?.(prevPoll)
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Login to vote")
    } finally {
      setVoting(null)
    }
  }

  // Badge color per status
  const badgeClass = isClosed
    ? "bg-slate-100 text-slate-500"
    : "bg-green-100 text-green-700"
  const badgeText = isClosed ? "Closed" : "Active"

  return (
    <div className="poll-card bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={() => router.push(`/club/${poll.club_id}`)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {poll.club_name}
          </button>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
            {poll.ends_at && !isClosed && (
              <span className="ml-2 text-amber-500 font-medium">
                · ends {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {badgeText}
        </span>
      </div>

      {/* Question */}
      <div className="px-5 pt-3 pb-4">
        <h3 className={`font-bold text-slate-900 leading-snug ${compact ? "text-sm" : "text-base"}`}>
          🗳️ {poll.question}
        </h3>

        {/* Options */}
        <div className="mt-4 space-y-2.5">
          {poll.options.map(option => {
            const pct      = getPct(option.vote_count)
            const isMyVote = poll.user_voted_option === option.id
            const isLoading = voting === option.id

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={isClosed || voting !== null}
                className={`w-full text-left relative overflow-hidden rounded-xl border transition-all duration-200
                  ${isMyVote
                    ? "border-indigo-400 bg-indigo-50"
                    : isClosed
                      ? "border-slate-100 bg-slate-50 cursor-default"
                      : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30"
                  } ${isLoading ? "opacity-70 scale-[0.99]" : ""}`}
              >
                {/* Animated fill bar */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-xl ${
                    isMyVote ? "bg-indigo-200/60" : "bg-slate-200/50"
                  }`}
                  style={{ width: hasVoted || isClosed ? `${pct}%` : "0%" }}
                />

                {/* Content */}
                <div className="relative flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {isMyVote && (
                      <span className="text-indigo-600 text-sm shrink-0">✓</span>
                    )}
                    <span className={`text-sm font-medium ${isMyVote ? "text-indigo-700" : "text-slate-700"}`}>
                      {option.option_text}
                    </span>
                  </div>
                  {(hasVoted || isClosed) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-500">{option.vote_count}</span>
                      <span className={`text-xs font-bold ${isMyVote ? "text-indigo-600" : "text-slate-400"}`}>
                        {pct}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400">
          <span>👥 {poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}</span>
          {poll.is_anonymous === 1 && <span>· 🔒 Anonymous</span>}
          {!hasVoted && !isClosed && (
            <span className="ml-auto text-indigo-400 font-medium">Tap to vote</span>
          )}
          {hasVoted && !isClosed && (
            <span className="ml-auto text-slate-400">Tap again to change</span>
          )}
        </div>
      </div>
    </div>
  )
}
