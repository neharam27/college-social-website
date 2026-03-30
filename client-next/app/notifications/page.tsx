"use client"

import { useEffect, useState, useCallback } from "react"
import api from "@/lib/api"
import { useRouter } from "next/navigation"
import Layout from "@/components/Layout"
import { formatDistanceToNow } from "date-fns"
import { toast } from "react-hot-toast"

interface Notification {
  id: number
  type: string
  message: string
  link: string
  is_read: boolean
  created_at: string
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  new_post: { icon: "📢", color: "bg-indigo-50 text-indigo-600" },
  like:     { icon: "❤️", color: "bg-pink-50 text-pink-600" },
  comment:  { icon: "💬", color: "bg-emerald-50 text-emerald-600" },
  default:  { icon: "🔔", color: "bg-slate-100 text-slate-500" },
}

type FilterType = "all" | "unread"

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<FilterType>("all")
  const router = useRouter()

  const fetchNotifs = useCallback(async (f: FilterType = filter) => {
    try {
      const res = await api.get(`/notifications?filter=${f}`)
      setNotifs(res.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initial load + poll every 30 seconds
  useEffect(() => {
    fetchNotifs(filter)
    const interval = setInterval(() => fetchNotifs(filter), 30_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      // Mark as read optimistically
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      api.patch(`/notifications/${n.id}/read`).catch(() => {})
    }
    if (n.link) router.push(n.link)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setNotifs(prev => prev.filter(x => x.id !== id))
    try {
      await api.delete(`/notifications/${id}`)
    } catch {
      toast.error("Failed to delete")
      fetchNotifs(filter)
    }
  }

  const markAllRead = async () => {
    setNotifs(prev => prev.map(x => ({ ...x, is_read: true })))
    await api.post("/notifications/read-all").catch(() => {})
  }

  const clearAll = async () => {
    setNotifs([])
    await api.delete("/notifications").catch(() => {})
    toast.success("All notifications cleared")
  }

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <Layout>
      <div className="max-w-2xl animate-fadeInUp">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-500 text-sm mt-1">
              {unread > 0 ? `${unread} unread` : "All caught up! ✅"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors"
              >
                Mark all read
              </button>
            )}
            {notifs.length > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-1.5 bg-red-50 text-red-500 border border-red-100 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {(["all", "unread"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all duration-150 capitalize ${
                filter === f
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {f}
              {f === "unread" && unread > 0 && (
                <span className="ml-1.5 bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl mb-4">
              {filter === "unread" ? "✅" : "🔔"}
            </div>
            <p className="text-slate-700 font-semibold">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {filter === "unread"
                ? "You're all caught up!"
                : "Follow clubs to get notified about new posts."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((n, i) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.default
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`group animate-fadeInUp delay-${Math.min(i * 30, 200)} relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-150 cursor-pointer hover:shadow-md ${
                    n.is_read
                      ? "bg-white border-slate-100"
                      : "bg-indigo-50/60 border-indigo-100"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${n.is_read ? "bg-slate-100" : "bg-white shadow-sm"}`}>
                    {meta.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.is_read ? "text-slate-600" : "text-slate-900 font-medium"}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Right side: unread dot + delete */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 text-xs p-1 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
