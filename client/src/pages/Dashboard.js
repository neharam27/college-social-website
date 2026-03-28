import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import axios from "axios"
import Layout from "../components/Layout"
import { toast } from "react-hot-toast"

function Dashboard() {
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState({})
  const [clubs, setClubs] = useState([])
  const [role, setRole] = useState("")
  const navigate = useNavigate()

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem("token")

      const res = await axios.get(
        "http://localhost:5000/api/posts/feed",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setPosts(res.data)
    } catch (err) {
      console.log(err)
    }
  }

  const fetchClubs = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/clubs/all"
      )
      setClubs(res.data)
    } catch (err) {
      console.log(err)
    }
  }

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem("token")

      await axios.post(
        "http://localhost:5000/api/likes/like",
        { post_id: postId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      fetchPosts()
    } catch (err) {
      toast.error("Already liked")
    }
  }
  const handleUnfollow = async (clubId) => {
  try {

    const token = localStorage.getItem("token")

    await axios.post(
      "http://localhost:5000/api/followers/unfollow",
      { club_id: clubId },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    toast.success("Unfollowed Club ❌")
    fetchPosts()

  } catch {
    toast.error("Error")
  }
}

  const handleDelete = async (postId) => {
    try {
      const token = localStorage.getItem("token")

      await axios.delete(
        `http://localhost:5000/api/posts/delete/${postId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      toast.success("Post deleted 🗑️")
      fetchPosts()
    } catch (err) {
      toast.error("Delete failed")
    }
  }

  const handleFollow = async (clubId) => {
    try {
      const token = localStorage.getItem("token")

      await axios.post(
        "http://localhost:5000/api/followers/follow",
        { club_id: clubId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      toast.success("Followed club! 🎉")
      fetchPosts()
    } catch (err) {
      toast.error("Already following or error")
    }
  }

  const fetchComments = async (postId) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/comments/${postId}`
      )

      setComments(prev => ({
        ...prev,
        [postId]: res.data
      }))
    } catch (err) {
      console.log(err)
    }
  }

  const handleComment = async (postId, text) => {
    if (!text.trim()) return

    try {
      const token = localStorage.getItem("token")

      await axios.post(
        "http://localhost:5000/api/comments/add",
        { post_id: postId, comment: text },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      fetchComments(postId)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    fetchPosts()
    fetchClubs()

    const token = localStorage.getItem("token")

    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setRole(payload.role)
    }
  }, [])

  return (
    <Layout>

      {/* CLUB FOLLOW SECTION */}
      <h2 className="text-2xl font-bold mb-4 text-gray-700">
        All Clubs
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        {clubs.map((club) => (
          <div
            key={club.id}
            className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition"
          >

            <h3
              className="text-lg font-semibold text-indigo-600 cursor-pointer hover:underline"
              onClick={() => navigate(`/club/${club.id}`)}
            >
              {club.club_name}
            </h3>

           <button
  onClick={() => handleFollow(club.id)}
  className="mt-3 mr-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
>
  Follow
</button>

<button
  onClick={() => handleUnfollow(club.id)}
  className="mt-3 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
>
  Unfollow
</button>

          </div>
        ))}

      </div>

      {/* FEED SECTION */}
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        Dashboard Feed
      </h2>

      {posts.length === 0 && (
        <p className="text-gray-500 mb-6">
          Follow clubs to see posts in your personalized feed 👆
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition"
          >

            <div className="px-5 pt-4">

              <h3
                className="text-lg font-semibold text-indigo-600 cursor-pointer hover:underline"
                onClick={() => navigate(`/club/${post.club_id}`)}
              >
                {post.club_name}
              </h3>

              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>

            </div>

            {post.image && (
              <img
                src={post.image}
                alt="Post"
                className="w-full h-60 object-cover mt-3 transform hover:scale-105 transition duration-300"
              />
            )}

            <div className="px-5 py-4">

              <p className="text-gray-700">
                {post.content}
              </p>

              <div className="flex items-center justify-between mt-4">

                <p className="text-sm text-gray-500">
                  ❤️ {post.like_count} Likes
                </p>

                <div className="space-x-2">

                  <button
                    onClick={() => handleLike(post.id)}
                    className="px-4 py-1 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition transform hover:scale-110"
                  >
                    Like
                  </button>

                  {role === "club_admin" && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="px-4 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  )}

                </div>

              </div>

              <button
                onClick={() => fetchComments(post.id)}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Show Comments
              </button>

              {comments[post.id] &&
                comments[post.id].map((c) => (
                  <div key={c.id} className="mt-2 text-sm">
                    <strong>{c.name}</strong>: {c.comment}
                  </div>
                ))
              }

              <input
                type="text"
                placeholder="Write a comment and press Enter"
                className="mt-3 w-full border p-2 rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleComment(post.id, e.target.value)
                    e.target.value = ""
                  }
                }}
              />

            </div>

          </div>
        ))}

      </div>

    </Layout>
  )
}

export default Dashboard