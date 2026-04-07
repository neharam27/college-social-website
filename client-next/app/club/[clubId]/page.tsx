"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import api from "@/lib/api"
import Layout from "@/components/Layout"
import { toast } from "react-hot-toast"
import { formatDistanceToNow, format } from "date-fns"

interface Club {
  id: number
  club_name: string
  description: string
  logo: string | null
  created_at: string
}
interface Post {
  id: number
  club_name: string
  content: string
  image?: string
  like_count: number
  created_at: string
}
interface Comment { id: number; name: string; comment: string; created_at: string }

// Gradient palette per club ID (cycles)
const GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
]

export default function ClubPage() {
  const params = useParams()
  const clubId = params.clubId as string
  const router = useRouter()

  const [club,          setClub]          = useState<Club | null>(null)
  const [posts,         setPosts]         = useState<Post[]>([])
  const [comments,      setComments]      = useState<Record<number, Comment[]>>({})
  const [openComments,  setOpenComments]  = useState<Record<number, boolean>>({})
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})
  const [likedIds,      setLikedIds]      = useState<number[]>([])
  const [following,     setFollowing]     = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [role,          setRole]          = useState("")
  const [myClubId,      setMyClubId]      = useState<number | null>(null)
  const [loading,       setLoading]       = useState(true)

  const gradient = GRADIENTS[(parseInt(clubId) - 1) % GRADIENTS.length]

  const fetchAll = useCallback(async () => {
    // Club info
    const clubRes = await axios.get(`http://localhost:5000/api/clubs/${clubId}`)

    // Posts, follower count, follow status — in parallel
    const [postsRes, follRes] = await Promise.all([
      axios.get(`http://localhost:5000/api/posts/club/${clubId}`),
      axios.get(`http://localhost:5000/api/followers/${clubId}`),
    ])

    setClub(clubRes.data)
    setPosts(postsRes.data)
    setFollowerCount(follRes.data.followerCount ?? 0)

    // Auth-gated checks
    try {
      const [checkRes, likedRes] = await Promise.all([
        api.get(`/followers/check/${clubId}`),
        api.get("/likes/my"),
      ])
      setFollowing(checkRes.data.isFollowing)
      if (Array.isArray(likedRes.data)) setLikedIds(likedRes.data)
    } catch { /* not logged in — fine */ }

    setLoading(false)
  }, [clubId])

  useEffect(() => {
    // Read role from saved user
    try {
      const saved = localStorage.getItem("user")
      if (saved) {
        const u = JSON.parse(saved)
        setRole(u.role || "")
        setMyClubId(u.club_id || null)
      }
    } catch { /* ignore */ }

    fetchAll()
  }, [fetchAll])

  // ── Like toggle ──────────────────────────────────────────────────────────
  const handleLike = async (postId: number) => {
    const alreadyLiked = likedIds.includes(postId)
    if (alreadyLiked) {
      setLikedIds(prev => prev.filter(id => id !== postId))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count - 1 } : p))
      api.delete("/likes/unlike", { data: { post_id: postId } }).catch(() => {
        setLikedIds(prev => [...prev, postId])
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + 1 } : p))
      })
    } else {
      setLikedIds(prev => [...prev, postId])
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + 1 } : p))
      api.post("/likes/like", { post_id: postId }).catch(() => {
        setLikedIds(prev => prev.filter(id => id !== postId))
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count - 1 } : p))
      })
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (postId: number) => {
    try {
      await api.delete(`/posts/delete/${postId}`)
      setPosts(p => p.filter(post => post.id !== postId))
      toast.success("Post deleted 🗑️")
    } catch { toast.error("Delete failed") }
  }

  // ── Comments ─────────────────────────────────────────────────────────────
  const toggleComments = async (postId: number) => {
    const isOpen = openComments[postId]
    setOpenComments(prev => ({ ...prev, [postId]: !isOpen }))
    if (!isOpen && !comments[postId]) {
      const res = await axios.get(`http://localhost:5000/api/comments/${postId}`)
      setComments(prev => ({ ...prev, [postId]: res.data }))
    }
  }
  const handleComment = async (postId: number) => {
    const text = commentInputs[postId]?.trim()
    if (!text) return
    try {
      await api.post("/comments/add", { post_id: postId, comment: text })
      setCommentInputs(prev => ({ ...prev, [postId]: "" }))
      const res = await axios.get(`http://localhost:5000/api/comments/${postId}`)
      setComments(prev => ({ ...prev, [postId]: res.data }))
    } catch { /* silent */ }
  }

  // ── Follow ───────────────────────────────────────────────────────────────
  const handleFollow = async () => {
    try {
      await api.post("/followers/follow", { club_id: clubId })
      setFollowing(true); setFollowerCount(c => c + 1); toast.success("Following! 🎉")
    } catch { toast.error("Error following") }
  }
  const handleUnfollow = async () => {
    try {
      await api.post("/followers/unfollow", { club_id: clubId })
      setFollowing(false); setFollowerCount(c => Math.max(0, c - 1)); toast.success("Unfollowed")
    } catch { toast.error("Error") }
  }

  const isMyClub = role === "club_admin" && myClubId === parseInt(clubId)
  const totalLikes = posts.reduce((sum, p) => sum + p.like_count, 0)

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl animate-fadeInUp">
          <div className="h-52 rounded-3xl bg-white border border-slate-100 animate-pulse mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse space-y-3">
                <div className="h-3 bg-slate-100 rounded w-1/4" />
                <div className="h-20 bg-slate-100 rounded" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  if (!club) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-2xl mb-4">⚠️</div>
          <p className="text-slate-800 font-semibold text-lg">Club not found</p>
          <button onClick={() => router.back()} className="mt-4 text-indigo-600 text-sm hover:underline">← Go back</button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-500 transition-colors mb-5 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
        </button>

        {/* ── Club Hero Banner ──────────────────────────────────────────── */}
        <div className={`animate-fadeInUp relative bg-gradient-to-br ${gradient} rounded-3xl overflow-hidden mb-6 shadow-lg`}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Club icon */}
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-3xl font-black text-white">{club.club_name[0]}</span>
              </div>

              {/* Club info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{club.club_name}</h1>
                {club.description && (
                  <p className="text-white/80 text-sm mt-1.5 leading-relaxed max-w-xl">{club.description}</p>
                )}
                <p className="text-white/60 text-xs mt-2">
                  Active since {format(new Date(club.created_at), "MMMM yyyy")}
                </p>
              </div>

              {/* Follow button */}
              {!isMyClub && (
                <button
                  onClick={following ? handleUnfollow : handleFollow}
                  className={`shrink-0 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    following
                      ? "bg-white/20 text-white border border-white/30 hover:bg-white/30"
                      : "bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg shadow-black/20"
                  }`}
                >
                  {following ? "✓ Following" : "+ Follow"}
                </button>
              )}
              {isMyClub && (
                <span className="shrink-0 px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-medium border border-white/20">
                  ⚙️ Your Club
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-6 pt-5 border-t border-white/20">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{followerCount}</p>
                <p className="text-white/60 text-xs">Followers</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-black text-white">{posts.length}</p>
                <p className="text-white/60 text-xs">Posts</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-black text-white">{totalLikes}</p>
                <p className="text-white/60 text-xs">Total Likes</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Posts ────────────────────────────────────────────────────── */}
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 animate-fadeInUp delay-100">
          Posts & Updates
        </h2>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fadeInUp delay-100">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl mb-4">📭</div>
            <p className="text-slate-700 font-semibold">No posts yet</p>
            <p className="text-slate-400 text-sm mt-1">This club hasn&apos;t posted anything yet.</p>
            {isMyClub && (
              <button
                onClick={() => router.push("/create-post")}
                className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Create your first post ✎
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {posts.map((post, i) => (
              <div
                key={post.id}
                className={`post-card animate-fadeInUp delay-${Math.min(i * 50, 300)} relative bg-white rounded-2xl border border-slate-100 overflow-hidden`}
              >
                {post.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.image} alt="Post" className="w-full h-52 object-cover" />
                )}
                <div className="p-5">
                  {/* Delete button for club admin */}
                  {isMyClub && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/80 text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all text-xs shadow-sm"
                      title="Delete post"
                    >✕</button>
                  )}

                  <p className="text-slate-700 text-sm leading-relaxed">{post.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>

                  {/* Action bar */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50">
                    {/* Like toggle */}
                    <button
                      onClick={() => handleLike(post.id)}
                      title={likedIds.includes(post.id) ? "Unlike" : "Like"}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-150 ${
                        likedIds.includes(post.id)
                          ? "text-pink-600 hover:text-slate-400"
                          : "text-slate-400 hover:text-pink-600"
                      }`}
                    >
                      <span className="text-base">{likedIds.includes(post.id) ? "❤️" : "🤍"}</span>
                      <span>{post.like_count}</span>
                    </button>

                    {/* Comments toggle */}
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <span>💬</span>
                      <span>{openComments[post.id] ? "Hide" : "Comments"}</span>
                      {comments[post.id]?.length > 0 && (
                        <span className="bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                          {comments[post.id].length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Comments section */}
                  {openComments[post.id] && (
                    <div className="mt-3 space-y-2 animate-fadeInUp">
                      {comments[post.id]?.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No comments yet — be the first!</p>
                      )}
                      {comments[post.id]?.map(c => (
                        <div key={c.id} className="flex gap-2 text-xs">
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {c.name[0].toUpperCase()}
                          </span>
                          <div className="bg-slate-50 rounded-xl px-3 py-2 flex-1">
                            <span className="font-semibold text-slate-700">{c.name} </span>
                            <span className="text-slate-600">{c.comment}</span>
                          </div>
                        </div>
                      ))}

                      {/* Comment input */}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          placeholder="Write a comment…"
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") handleComment(post.id) }}
                          className="input-primary flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-800"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
