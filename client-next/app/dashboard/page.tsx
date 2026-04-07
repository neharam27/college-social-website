"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import axios from "axios"
import api from "@/lib/api"
import Layout from "@/components/Layout"
import { toast } from "react-hot-toast"
import PollCard, { Poll } from "@/components/PollCard"

interface Post {
  id: number; club_id: number; club_name: string; content: string
  image?: string; like_count: number; comment_count: number; created_at: string
}
interface Club { id: number; club_name: string; follower_count: number }
interface Comment { id: number; name: string; comment: string }

export default function DashboardPage() {
  const [posts,        setPosts]        = useState<Post[]>([])
  const [comments,     setComments]     = useState<Record<number, Comment[]>>({})
  const [clubs,        setClubs]        = useState<Club[]>([])
  const [role,         setRole]         = useState("")
  const [loading,      setLoading]      = useState(true)
  const [followedIds,  setFollowedIds]  = useState<number[]>([])
  const [likedIds,     setLikedIds]     = useState<number[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([])
  const [bookmarking,  setBookmarking]  = useState<number | null>(null)
  const [polls,        setPolls]        = useState<Poll[]>([])
  const router = useRouter()

  const fetchAll = async () => {
    // Load clubs (public — no auth needed)
    axios.get("http://localhost:5000/api/clubs/all")
      .then(r => setClubs(r.data))
      .catch(() => {})

    // Load recent active polls
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    axios.get("http://localhost:5000/api/polls/all", {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => {
      const active = (r.data as Poll[]).filter(
        p => p.status === "active" && (!p.ends_at || new Date(p.ends_at) > new Date())
      ).slice(0, 3)
      setPolls(active)
    }).catch(() => {})

    // Load followed club IDs
    try {
      const followedRes = await api.get("/followers/my")
      const ids: number[] = followedRes.data.map((f: { club_id: number }) => f.club_id)
      setFollowedIds(ids)

      if (ids.length > 0) {
        try {
          const feedRes = await api.get("/posts/feed")
          setPosts(feedRes.data)
        } catch { setPosts([]) }
      } else {
        try {
          const allRes = await axios.get("http://localhost:5000/api/posts/all")
          setPosts(allRes.data)
        } catch { setPosts([]) }
      }
    } catch {
      try {
        const allRes = await axios.get("http://localhost:5000/api/posts/all")
        setPosts(allRes.data)
      } catch { setPosts([]) }
    }

    // Fetch liked + bookmarked post IDs in parallel
    api.get("/likes/my")
      .then(r => { if (Array.isArray(r.data)) setLikedIds(r.data) })
      .catch(() => {})

    api.get("/bookmarks/my-ids")
      .then(r => { if (Array.isArray(r.data)) setBookmarkedIds(r.data) })
      .catch(() => {})

    setLoading(false)
  }

  const handleLike = async (postId: number) => {
    const alreadyLiked = likedIds.includes(postId)
    if (alreadyLiked) {
      setLikedIds(prev => prev.filter(id => id !== postId))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count - 1 } : p))
    } else {
      setLikedIds(prev => [...prev, postId])
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + 1 } : p))
    }
    try {
      if (alreadyLiked) {
        await api.delete("/likes/unlike", { data: { post_id: postId } })
      } else {
        await api.post("/likes/like", { post_id: postId })
      }
    } catch {
      if (alreadyLiked) {
        setLikedIds(prev => [...prev, postId])
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + 1 } : p))
      } else {
        setLikedIds(prev => prev.filter(id => id !== postId))
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count - 1 } : p))
      }
    }
  }

  const handleBookmark = async (postId: number) => {
    if (bookmarking === postId) return
    const alreadyBookmarked = bookmarkedIds.includes(postId)
    setBookmarking(postId)
    // Optimistic update
    if (alreadyBookmarked) {
      setBookmarkedIds(prev => prev.filter(id => id !== postId))
    } else {
      setBookmarkedIds(prev => [...prev, postId])
    }
    try {
      const res = await api.post("/bookmarks/save", { post_id: postId })
      if (res.data.bookmarked) {
        toast.success("Saved to bookmarks 📌")
      } else {
        toast("Bookmark removed", { icon: "🗂️" })
      }
    } catch {
      // Revert
      if (alreadyBookmarked) {
        setBookmarkedIds(prev => [...prev, postId])
      } else {
        setBookmarkedIds(prev => prev.filter(id => id !== postId))
      }
      toast.error("Login required to bookmark")
    } finally {
      setBookmarking(null)
    }
  }

  const handleFollow = async (clubId: number) => {
    try {
      await api.post("/followers/follow", { club_id: clubId })
      toast.success("Following! 🎉")
      setFollowedIds(prev => [...prev, clubId])
      fetchAll()
    } catch { toast.error("Already following") }
  }
  const handleUnfollow = async (clubId: number) => {
    try {
      await api.post("/followers/unfollow", { club_id: clubId })
      toast.success("Unfollowed ❌")
      setFollowedIds(prev => prev.filter(id => id !== clubId))
      fetchAll()
    } catch { toast.error("Error") }
  }
  const handleDelete = async (postId: number) => {
    try {
      await api.delete(`/posts/delete/${postId}`)
      toast.success("Post deleted 🗑️"); fetchAll()
    } catch { toast.error("Delete failed") }
  }
  const fetchComments = async (postId: number) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/comments/${postId}`)
      setComments(p => ({ ...p, [postId]: res.data }))
    } catch { /* silent */ }
  }
  const handleComment = async (postId: number, text: string) => {
    if (!text.trim()) return
    try {
      await api.post("/comments/add", { post_id: postId, comment: text })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
      fetchComments(postId)
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchAll()
    try {
      const saved = localStorage.getItem("user")
      if (saved) setRole(JSON.parse(saved).role || "")
      else {
        const t = localStorage.getItem("token")
        if (t) setRole(JSON.parse(atob(t.split(".")[1])).role || "")
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Skeleton = () => (
    <div className="bg-white rounded-2xl p-5 animate-pulse space-y-3 border border-slate-100">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-3 bg-slate-100 rounded w-1/5" />
      <div className="h-20 bg-slate-100 rounded" />
      <div className="h-3 bg-slate-100 rounded w-1/4" />
    </div>
  )

  return (
    <Layout>
      {/* PAGE HEADER */}
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Your personalized college feed</p>
      </div>

      {/* CLUBS ROW */}
      <section className="mb-8 animate-fadeInUp delay-50">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Clubs</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {clubs.map((club, i) => {
            const following = followedIds.includes(club.id)
            const colors = ["from-indigo-500 to-violet-600","from-pink-500 to-rose-500","from-emerald-500 to-teal-600","from-amber-400 to-orange-500","from-sky-500 to-blue-600","from-violet-500 to-purple-600","from-cyan-500 to-blue-600","from-fuchsia-500 to-pink-600"]
            const c = colors[(club.id - 1) % colors.length]
            return (
              <div
                key={club.id}
                className={`animate-fadeInUp delay-${Math.min(i * 50, 300)} club-card bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-2 cursor-pointer group`}
                onClick={() => router.push(`/club/${club.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                    {club.club_name[0]}
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all text-sm">→</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                  {club.club_name}
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>👥</span>
                  <span>{club.follower_count ?? 0} member{(club.follower_count ?? 0) !== 1 ? "s" : ""}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); following ? handleUnfollow(club.id) : handleFollow(club.id) }}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    following
                      ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {following ? "Following ✓" : "+ Follow"}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ACTIVE POLLS STRIP */}
      {polls.length > 0 && (
        <section className="mb-8 animate-fadeInUp delay-75">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
              🗳️ Active Polls
            </h2>
            <button
              onClick={() => router.push("/polls")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              See all →
            </button>
          </div>
          <div className={`grid gap-4 ${polls.length === 1 ? "grid-cols-1 max-w-md" : polls.length === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}>
            {polls.map((poll, i) => (
              <div key={poll.id} className={`animate-fadeInUp delay-${i * 75}`}>
                <PollCard
                  poll={poll}
                  compact
                  onPollUpdate={updated =>
                    setPolls(prev => prev.map(p => p.id === updated.id ? updated : p))
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FEED */}
      <section className="animate-fadeInUp delay-100">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">
          {followedIds.length > 0 ? "Your Feed" : "Discover Posts"}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1,2,3,4].map(i => <Skeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl mb-4">📭</div>
            <p className="text-slate-700 font-semibold">Nothing in your feed yet</p>
            <p className="text-slate-400 text-sm mt-1">Follow clubs above to see their posts here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {posts.map((post, i) => (
              <div
                key={post.id}
                className={`post-card animate-fadeInUp delay-${Math.min(i * 50, 300)} bg-white rounded-2xl border border-slate-100 overflow-hidden relative`}
              >
                {/* Card header */}
                <div className="px-5 pt-5 flex items-start justify-between">
                  <div>
                    <h3
                      className="font-semibold text-indigo-600 cursor-pointer hover:text-indigo-700 transition-colors text-sm"
                      onClick={() => router.push(`/club/${post.club_id}`)}
                    >
                      {post.club_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Bookmark button */}
                    <button
                      onClick={() => handleBookmark(post.id)}
                      title={bookmarkedIds.includes(post.id) ? "Remove bookmark" : "Save post"}
                      className={`transition-all duration-200 text-base ${
                        bookmarking === post.id ? "opacity-50 scale-90" : "hover:scale-110"
                      } ${bookmarkedIds.includes(post.id) ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}
                    >
                      {bookmarkedIds.includes(post.id) ? "🔖" : "🏷️"}
                    </button>
                    {role === "club_admin" && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors text-sm"
                        title="Delete post"
                      >✕</button>
                    )}
                  </div>
                </div>

                {/* Image */}
                {post.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.image} alt="Post" className="w-full h-52 object-cover mt-4" />
                )}

                {/* Content */}
                <div className="px-5 py-4">
                  <p className="text-slate-700 text-sm leading-relaxed">{post.content}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                        likedIds.includes(post.id)
                          ? "text-pink-600 hover:text-slate-400"
                          : "text-slate-400 hover:text-pink-600"
                      }`}
                      title={likedIds.includes(post.id) ? "Unlike" : "Like"}
                    >
                      <span>{likedIds.includes(post.id) ? "❤️" : "🤍"}</span>
                      {post.like_count}
                    </button>
                    <button
                      onClick={() => fetchComments(post.id)}
                      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      <span>💬</span>
                      <span>{post.comment_count > 0 ? post.comment_count : ""} Comment{post.comment_count !== 1 ? "s" : ""}</span>
                    </button>
                  </div>

                  {/* Comments */}
                  {comments[post.id] && (
                    <div className="mt-3 space-y-2">
                      {comments[post.id].map(c => (
                        <div key={c.id} className="flex gap-2 text-xs">
                          <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0">
                            {c.name[0]}
                          </span>
                          <div className="bg-slate-50 rounded-lg px-3 py-1.5">
                            <span className="font-semibold text-slate-700">{c.name}: </span>
                            <span className="text-slate-600">{c.comment}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Add a comment… (Enter to post)"
                    className="mt-3 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-slate-700"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        handleComment(post.id, (e.target as HTMLInputElement).value)
                        ;(e.target as HTMLInputElement).value = ""
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
