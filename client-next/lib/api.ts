import axios from "axios"

const BASE = "http://localhost:5000/api"

const api = axios.create({ baseURL: BASE })

// Attach the current access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

// On 401 → try to refresh the token, then replay the original request
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue up any other requests while we're already refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem("refreshToken")

      if (!refreshToken) {
        // No refresh token → force logout
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/"
        return Promise.reject(error)
      }

      try {
        const res = await axios.post(`${BASE}/auth/refresh`, { refreshToken })
        const newToken = res.data.accessToken

        localStorage.setItem("token", newToken)
        if (res.data.user) localStorage.setItem("user", JSON.stringify(res.data.user))

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        original.headers.Authorization = `Bearer ${newToken}`

        processQueue(null, newToken)
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem("token")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        window.location.href = "/"
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
