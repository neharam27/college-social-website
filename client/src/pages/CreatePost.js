import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "../components/Layout"

function CreatePost() {

  const [clubId, setClubId] = useState("")
  const [content, setContent] = useState("")
  const [image, setImage] = useState("")
  const [clubs, setClubs] = useState([])

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

  useEffect(() => {
    fetchClubs()
  }, [])

  const handleCreate = async () => {

    if (!clubId || !content.trim()) {
      alert("Please select club and enter content")
      return
    }

    try {

      const token = localStorage.getItem("token")

      await axios.post(
        "http://localhost:5000/api/posts/create",
        { club_id: clubId, content, image },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      alert("Post created 🎉")

      // CLEAR FORM
      setClubId("")
      setContent("")
      setImage("")

    } catch (err) {
      alert("Error creating post")
    }
  }

  return (
    <Layout>

      <div className="flex justify-center">

        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg">

          <h2 className="text-2xl font-bold text-indigo-600 mb-6">
            Create New Post
          </h2>

          {/* CLUB SELECT DROPDOWN */}
          <select
            value={clubId}
            className="w-full mb-4 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onChange={(e) => setClubId(e.target.value)}
          >
            <option value="">Select Club</option>

            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.club_name}
              </option>
            ))}

          </select>

          {/* CONTENT */}
          <textarea
            value={content}
            placeholder="Post Content"
            className="w-full mb-4 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onChange={(e) => setContent(e.target.value)}
          />

          {/* IMAGE URL */}
          <input
            type="text"
            value={image}
            placeholder="Image URL"
            className="w-full mb-6 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onChange={(e) => setImage(e.target.value)}
          />

          {/* CREATE BUTTON */}
          <button
            onClick={handleCreate}
            className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition"
          >
            Create Post
          </button>

        </div>

      </div>

    </Layout>
  )
}

export default CreatePost
