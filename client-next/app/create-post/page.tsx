"use client"

import { useState, useEffect } from "react"
import api from "@/lib/api"
import Layout from "@/components/Layout"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

export default function CreatePostPage() {
  const [clubId,   setClubId]   = useState<number | null>(null)
  const [clubName, setClubName] = useState("")
  const [content,  setContent]  = useState("")
  const [image,    setImage]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const [role,     setRole]     = useState("")
  const router = useRouter()

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user")
      if (saved) {
        const u = JSON.parse(saved)
        setRole(u.role || "")
        if (u.club_id) setClubId(u.club_id)
      }
    } catch { /* ignore */ }

    // Resolve club name from the clubs list
    api.get("/clubs/all").then(r => {
      const saved = localStorage.getItem("user")
      if (!saved) return
      const u = JSON.parse(saved)
      const myClub = r.data.find((c: { id: number; club_name: string }) => c.id === u.club_id)
      if (myClub) setClubName(myClub.club_name)
    }).catch(() => {})
  }, [])

  if (role && role !== "club_admin") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-2xl mb-4">🚫</div>
          <p className="text-slate-800 font-semibold text-lg">Access Restricted</p>
          <p className="text-slate-400 text-sm mt-1">Only club admins can create posts.</p>
        </div>
      </Layout>
    )
  }

  const handleCreate = async () => {
    if (!clubId || !content.trim()) { toast.error("Please add some content"); return }
    setLoading(true)
    try {
      await api.post("/posts/create", { club_id: clubId, content, image: image || undefined })
      toast.success("Post published! 🎉")
      setContent(""); setImage("")
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || "Failed to create post")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl animate-fadeInUp">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Create Post</h1>
          <p className="text-slate-500 text-sm mt-1">Share news and updates with your club followers</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          {/* Club badge — read-only, admins own exactly one club */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Posting as</label>
            <div className="flex items-center gap-3 px-4 py-3 border border-indigo-200 bg-indigo-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {clubName ? clubName[0] : "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-700">{clubName || "Loading…"}</p>
                <p className="text-xs text-indigo-400">Club Admin</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Content</label>
            <textarea
              value={content}
              rows={5}
              placeholder="What's happening at your club?"
              onChange={e => setContent(e.target.value)}
              className="input-primary w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm resize-none"
            />
            <p className="text-right text-xs text-slate-400 mt-1">{content.length} / 2000 chars</p>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Image URL <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="url"
              value={image}
              placeholder="https://…"
              onChange={e => setImage(e.target.value)}
              className="input-primary w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm"
            />
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Preview" className="mt-3 w-full h-40 object-cover rounded-xl" onError={e => (e.currentTarget.style.display = "none")} />
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !clubId}
            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:from-indigo-700 hover:to-violet-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing…
              </span>
            ) : "Publish Post ✎"}
          </button>
        </div>
      </div>
    </Layout>
  )
}
