import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import Layout from "../components/Layout"

function ClubPage() {

  const { clubId } = useParams()
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState({})
  const [role, setRole] = useState("")

  const fetchClubPosts = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/posts/club/${clubId}`
      )
      setPosts(res.data)
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

      fetchClubPosts()
    } catch (err) {
      alert("Already liked or error")
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

      alert("Post deleted 🗑️")
      fetchClubPosts()
    } catch (err) {
      alert("Delete failed")
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
    fetchClubPosts()

    const token = localStorage.getItem("token")

    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setRole(payload.role)
    }

  }, [])

  return (
    <Layout>

      <h2 className="text-3xl font-bold mb-6 text-indigo-600">
          Club Events & Activities
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition"
          >

            {/* CLUB NAME */}
            <div className="px-5 pt-4">
              <h3 className="text-xl font-semibold text-indigo-600">
                {post.club_name}
              </h3>
            </div>

            {/* IMAGE */}
            {post.image && (
              <img
                src={post.image}
                alt="Post"
                className="w-full h-64 object-cover mt-3"
              />
            )}

            {/* CONTENT */}
            <div className="px-5 py-4">
              <p className="text-gray-700">
                {post.content}
              </p>

              {/* ACTIONS */}
              <div className="flex items-center justify-between mt-4">

                <p className="text-sm text-gray-500">
                  ❤️ {post.like_count} Likes
                </p>

                <div className="space-x-2">

                  <button
                    onClick={() => handleLike(post.id)}
                    className="px-4 py-1 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
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

              {/* COMMENT BUTTON */}
              <button
                onClick={() => fetchComments(post.id)}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Show Comments
              </button>

              {/* COMMENTS */}
              {comments[post.id] &&
                comments[post.id].map((c) => (
                  <div key={c.id} className="mt-2 text-sm text-gray-700">
                    <strong>{c.name}</strong>: {c.comment}
                  </div>
                ))
              }

              {/* COMMENT INPUT */}
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

export default ClubPage