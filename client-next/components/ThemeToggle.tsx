"use client"

import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Read initial theme set by the anti-flicker script
    setDark(document.documentElement.getAttribute("data-theme") === "dark")
  }, [])

  const toggle = () => {
    const next = dark ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem("theme", next)
    setDark(!dark)
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200"
    >
      <span className="text-base w-5 text-center">{dark ? "☀️" : "🌙"}</span>
      <span>{dark ? "Light Mode" : "Dark Mode"}</span>
    </button>
  )
}
