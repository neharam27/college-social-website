"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import api from "@/lib/api"
import Layout from "@/components/Layout"
import { toast } from "react-hot-toast"

interface SavedPost {
  id: number
  club_id: number
  club_name: string
  content: string
  image?: string
  like_count: number
  comment_count: number
  created_at: string
  saved_at: string
}

export default function SavedPostsPage() {
  const [posts,   setPosts]   = useState<SavedPost[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    api.get("/bookmarks/my")
      .then(r => setPosts(r.data))
      .catch(() => toast.error("Could not load saved posts"))
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (postId: number) => {
    // Optimistic remove
    setPosts(prev => prev.filter(p => p.id !== postId))
    try {
      await api.post("/bookmarks/save", { post_id: postId })
      toast("Bookmark removed", { icon: "🗂️" })
    } catch {
      toast.error("Failed to remove")
      // Reload to restore state
      api.get("/bookmarks/my").then(r => setPosts(r.data)).catch(() => {})
    }
  }

  const Skeleton = () => (
    <div className="bg-white rounded-2xl p-5 animate-pulse border border-slate-100 space-y-3">
      <div className="h-3 bg-slate-100 rounded w-1/4" />
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-16 bg-slate-100 rounded" />
      <div className="h-3 bg-slate-100 rounded w-1/5" />
    </div>
  )

  return (
    <Layout>
      <div className="animate-fadeInUp">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">📌 Saved Posts</h1>
          <p className="text-slate-500 text-sm mt-1">
            Posts you&#39;ve bookmarked for later
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-18 h-18 w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center text-3xl mb-4 animate-float">
              📌
            </div>
            <p className="text-slate-700 font-semibold text-lg">Nothing saved yet</p>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Tap the 🏷️ icon on any post in your feed to save it here
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            >
              Browse Feed →
            </button>
          </div>
        ) : (
          <>
            {/* Count badge */}
            <div className="flex items-center gap-2 mb-5">
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {posts.length} saved
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {posts.map((post, i) => (
                <div
                  key={post.id}
                  className={`animate-fadeInUp delay-${Math.min(i * 50, 300)} post-card bg-white rounded-2xl border border-slate-100 overflow-hidden`}
                >
                  {/* Header */}
                  <div className="px-5 pt-5 flex items-start justify-between">
                    <div>
                      <button
                        onClick={() => router.push(`/club/${post.club_id}`)}
                        className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors text-sm"
                      >
                        {post.club_name}
                      </button>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 italic">
                        Saved {formatDistanceToNow(new Date(post.saved_at), { addSuffix: true })}
                      </span>
                      <button
                        onClick={() => handleRemove(post.id)}
                        title="Remove bookmark"
                        className="text-amber-500 hover:text-slate-400 transition-all duration-200 hover:scale-110 text-base"
                      >
                        🔖
                      </button>
                    </div>
                  </div>

                  {/* Image */}
                  {post.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.image} alt="Post" className="w-full h-48 object-cover mt-4" />
                  )}

                  {/* Content */}
                  <div className="px-5 py-4">
                    <p className="text-slate-700 text-sm leading-relaxed">{post.content}</p>

                    {/* Stats footer */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400">
                      <span>❤️ {post.like_count} likes</span>
                      <span>💬 {post.comment_count} comments</span>
                      <button
                        onClick={() => router.push(`/club/${post.club_id}`)}
                        className="ml-auto text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                      >
                        View club →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
