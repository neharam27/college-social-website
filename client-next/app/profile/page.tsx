"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import axios from "axios"
import api from "@/lib/api"
import Layout from "@/components/Layout"
import { toast } from "react-hot-toast"

interface UserInfo { id: number; name: string; email: string; role: string }
interface FollowedClub { club_id: number }
interface SavedPost {
  id: number; club_id: number; club_name: string; content: string
  image?: string; like_count: number; comment_count: number
  created_at: string; saved_at: string
}

export default function ProfilePage() {
  const [user,       setUser]       = useState<UserInfo | null>(null)
  const [followed,   setFollowed]   = useState<FollowedClub[]>([])
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState<"info" | "saved">("info")
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedLoaded,  setSavedLoaded]  = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      axios.get("http://localhost:5000/api/auth/me", { headers }),
      axios.get("http://localhost:5000/api/followers/my", { headers }),
    ]).then(([meRes, followedRes]) => {
      setUser(meRes.data)
      setFollowed(followedRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadSavedPosts = async () => {
    if (savedLoaded) return // already loaded
    setSavedLoading(true)
    try {
      const res = await api.get("/bookmarks/my")
      setSavedPosts(res.data)
      setSavedLoaded(true)
    } catch {
      toast.error("Could not load saved posts")
    } finally {
      setSavedLoading(false)
    }
  }

  const handleTabChange = (t: "info" | "saved") => {
    setTab(t)
    if (t === "saved") loadSavedPosts()
  }

  const handleRemoveBookmark = async (postId: number) => {
    try {
      await api.post("/bookmarks/save", { post_id: postId })
      setSavedPosts(prev => prev.filter(p => p.id !== postId))
      setSavedLoaded(false) // force reload next time
      toast("Bookmark removed", { icon: "🗂️" })
    } catch { toast.error("Error") }
  }

  const roleLabel = (r: string) => r === "club_admin" ? "Club Admin 🏛️" : "Student 🎓"

  const stats = [
    { label: "Clubs Following", value: followed.length, icon: "🔔" },
    { label: "Saved Posts",     value: savedPosts.length > 0 ? savedPosts.length : "—", icon: "📌" },
    { label: "Account Type",    value: user ? roleLabel(user.role) : "—", icon: "🎭" },
  ]

  return (
    <Layout>
      <div className="max-w-2xl animate-fadeInUp">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Your account information & saved posts</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl p-6 animate-pulse border border-slate-100 h-20" />)}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Avatar card */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) ?? "?"}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.name ?? "—"}</h2>
                <p className="text-indigo-200 text-sm">{user?.email ?? "—"}</p>
                <span className="mt-1 inline-block px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                  {user ? roleLabel(user.role) : "—"}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((s, i) => (
                <div key={i} className={`animate-fadeInUp delay-${i * 50} bg-white rounded-2xl border border-slate-100 p-4 text-center`}>
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="font-bold text-slate-900 text-sm">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* TABS */}
            <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
              {(["info", "saved"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    tab === t
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t === "info" ? "👤 Account Info" : "📌 Saved Posts"}
                </button>
              ))}
            </div>

            {/* TAB: Account Info */}
            {tab === "info" && (
              <div className="space-y-4">
                {/* Account info card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <h3 className="font-semibold text-slate-800 text-sm">Account Details</h3>
                  {[
                    { label: "Full Name",      value: user?.name },
                    { label: "Email Address",  value: user?.email },
                    { label: "Role",           value: user ? roleLabel(user.role) : "—" },
                    { label: "User ID",        value: `#${user?.id ?? "—"}` },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-500">{row.label}</span>
                      <span className="text-sm font-medium text-slate-800">{row.value ?? "—"}</span>
                    </div>
                  ))}
                </div>

                {/* Danger zone */}
                <div className="bg-white rounded-2xl border border-red-100 p-5">
                  <h3 className="font-semibold text-slate-800 text-sm mb-3">Danger Zone</h3>
                  <button
                    onClick={() => { localStorage.removeItem("token"); window.location.href = "/" }}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* TAB: Saved Posts */}
            {tab === "saved" && (
              <div>
                {savedLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-slate-100 h-24" />
                    ))}
                  </div>
                ) : savedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl mb-3">📌</div>
                    <p className="text-slate-700 font-semibold">No saved posts yet</p>
                    <p className="text-slate-400 text-sm mt-1">Tap the 🏷️ icon on any post to save it here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedPosts.map((post, i) => (
                      <div
                        key={post.id}
                        className={`animate-fadeInUp delay-${Math.min(i * 50, 300)} bg-white rounded-2xl border border-slate-100 p-5 post-card`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <button
                              onClick={() => router.push(`/club/${post.club_id}`)}
                              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              {post.club_name}
                            </button>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Saved {formatDistanceToNow(new Date(post.saved_at), { addSuffix: true })}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveBookmark(post.id)}
                            title="Remove bookmark"
                            className="text-amber-500 hover:text-slate-400 transition-colors text-base"
                          >
                            🔖
                          </button>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed line-clamp-3">{post.content}</p>
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 text-xs text-slate-400">
                          <span>❤️ {post.like_count}</span>
                          <span>💬 {post.comment_count}</span>
                          <span className="ml-auto text-xs text-slate-300">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
