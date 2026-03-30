"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import api from "@/lib/api"
import { ThemeToggle } from "@/components/ThemeToggle"

interface NavItem {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { href: "/dashboard",    label: "Dashboard",    icon: "⊞" },
  { href: "/create-post",  label: "Create Post",  icon: "✎", adminOnly: true },
  { href: "/notifications",label: "Notifications",icon: "🔔" },
  { href: "/profile",      label: "Profile",      icon: "👤" },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [role, setRole]           = useState("")
  const [name, setName]           = useState("")
  const [unread, setUnread]       = useState(0)
  const [sidebarOpen, setSidebar] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    // First try the saved user object (has name)
    try {
      const saved = localStorage.getItem("user")
      if (saved) {
        const u = JSON.parse(saved)
        setName(u.name || "")
        setRole(u.role || "")
      } else {
        // Fallback to JWT payload
        const payload = JSON.parse(atob(token.split(".")[1]))
        setRole(payload.role || "")
      }
    } catch { /* ignore */ }

    // fetch unread count
    api.get("/notifications/unread-count")
      .then(r => setUnread(r.data.count)).catch(() => {})
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    router.push("/")
  }

  const initials = name
    ? name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            CS
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-tight">CollegeSocial</p>
            <p className="text-xs text-slate-400">Campus Hub</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.filter(n => !n.adminOnly || role === "club_admin").map((item, i) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebar(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 animate-slideInLeft delay-${i * 50} ${
                active
                  ? "nav-link-active"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
              {item.href === "/notifications" && unread > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-3 border-t border-slate-700/50 space-y-1 pt-3">
        {/* Theme toggle */}
        <ThemeToggle />

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{name || "User"}</p>
            <p className="text-slate-400 text-xs capitalize">{role.replace("_", " ")}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-150"
        >
          <span>⇤</span> Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-60 bg-slate-900 flex-col shrink-0 shadow-xl">
        <SidebarContent />
      </aside>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-slate-900 z-50 flex flex-col transform transition-transform duration-300 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOPBAR (mobile) */}
        <header className="md:hidden flex items-center px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
          <button
            onClick={() => setSidebar(true)}
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 font-bold text-slate-800 text-sm">CollegeSocial 🚀</span>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
