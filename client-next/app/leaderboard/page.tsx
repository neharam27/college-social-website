"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import Layout from "@/components/Layout"

interface ClubRank {
  id: number
  club_name: string
  description: string | null
  follower_count: number
  post_count: number
  total_likes: number
  score: number
}

const MEDAL_COLORS = [
  "from-amber-400 to-yellow-500",    // 🥇 Gold
  "from-slate-400 to-slate-500",     // 🥈 Silver
  "from-amber-600 to-orange-600",    // 🥉 Bronze
]
const MEDAL_EMOJI = ["🥇", "🥈", "🥉"]
const CLUB_COLORS = [
  "from-indigo-500 to-violet-600",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
]

export default function LeaderboardPage() {
  const [clubs,   setClubs]   = useState<ClubRank[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    axios.get("http://localhost:5000/api/clubs/leaderboard")
      .then(r => setClubs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const podium = clubs.slice(0, 3)
  const rest   = clubs.slice(3)

  const StatPill = ({ icon, value, label }: { icon: string; value: number | string; label: string }) => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base">{icon}</span>
      <span className="font-bold text-slate-900 text-sm">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )

  return (
    <Layout>
      <div className="animate-fadeInUp">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">🏆 Leaderboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Top clubs ranked by followers, posts & likes
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-slate-100 h-20" />
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl mb-4">🏆</div>
            <p className="text-slate-700 font-semibold">No clubs yet</p>
            <p className="text-slate-400 text-sm mt-1">Be the first to create a club!</p>
          </div>
        ) : (
          <>
            {/* PODIUM — top 3 */}
            {podium.length > 0 && (
              <section className="mb-8">
                <div className={`grid gap-4 ${podium.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : podium.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {podium.map((club, i) => {
                    const cc = CLUB_COLORS[(club.id - 1) % CLUB_COLORS.length]
                    return (
                      <div
                        key={club.id}
                        onClick={() => router.push(`/club/${club.id}`)}
                        className={`animate-fadeInUp delay-${i * 100} relative bg-white rounded-2xl border border-slate-100 p-5 flex flex-col items-center text-center cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                          i === 0 ? "ring-2 ring-amber-300 ring-offset-2 shadow-amber-100 shadow-md" : ""
                        }`}
                      >
                        {/* Rank badge */}
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${MEDAL_COLORS[i]} flex items-center justify-center text-lg mb-3 shadow-md`}>
                          {MEDAL_EMOJI[i]}
                        </div>

                        {/* Club avatar */}
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cc} flex items-center justify-center text-white font-bold text-lg shadow-sm mb-3`}>
                          {club.club_name[0]}
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors mb-1">
                          {club.club_name}
                        </h3>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                          {club.description || "Campus club"}
                        </p>

                        <div className="flex gap-4 w-full justify-center border-t border-slate-50 pt-3">
                          <StatPill icon="👥" value={club.follower_count} label="Members" />
                          <StatPill icon="📝" value={club.post_count}     label="Posts" />
                          <StatPill icon="❤️" value={club.total_likes}   label="Likes" />
                        </div>

                        {/* Score chip */}
                        <div className={`mt-3 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${MEDAL_COLORS[i]} text-white shadow-sm`}>
                          ⭐ {club.score} pts
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* REST of clubs — ranked list */}
            {rest.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
                  Rankings
                </h2>
                <div className="space-y-2">
                  {rest.map((club, i) => {
                    const rank = i + 4
                    const cc = CLUB_COLORS[(club.id - 1) % CLUB_COLORS.length]
                    return (
                      <div
                        key={club.id}
                        onClick={() => router.push(`/club/${club.id}`)}
                        className={`animate-fadeInUp delay-${Math.min(i * 50, 300)} bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all duration-200 group`}
                      >
                        {/* Rank number */}
                        <div className="w-8 text-center text-sm font-bold text-slate-400 shrink-0">
                          #{rank}
                        </div>

                        {/* Club avatar */}
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cc} flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0`}>
                          {club.club_name[0]}
                        </div>

                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                            {club.club_name}
                          </p>
                          {club.description && (
                            <p className="text-xs text-slate-400 truncate">{club.description}</p>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                          <span title="followers">👥 {club.follower_count}</span>
                          <span title="posts">📝 {club.post_count}</span>
                          <span title="likes">❤️ {club.total_likes}</span>
                        </div>

                        {/* Score */}
                        <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg shrink-0">
                          {club.score} pts
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Score legend */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
              <p className="font-semibold text-slate-700 mb-1">📊 How scores are calculated</p>
              <p>Each <strong>follower</strong> = 3 pts · Each <strong>post</strong> = 2 pts · Each <strong>like</strong> = 1 pt</p>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
