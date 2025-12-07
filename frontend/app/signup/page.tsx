"use client"
import { useState } from "react"
import { signup } from "@/lib/api"
import Link from "next/link"
import Image from "next/image"
import "../auth.css"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [fullName, setFullName] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setLoading(true)

    if (!email.endsWith("@gmu.edu")) {
      setMessage("You must use your Mason email address.")
      setLoading(false)
      return
    }

    // Password strength validation
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.")
      setLoading(false)
      return
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.")
      setLoading(false)
      return
    }

    if (!fullName.trim()) {
      setMessage("Please enter your full name.")
      setLoading(false)
      return
    }

    try {
      // Call backend signup API
      const response = await signup({
        email,
        password,
        full_name: fullName
      })

      setMessage(response.message || "Success! Check your GMU email to verify your account before logging in.")
      setLoading(false)

      // Clear form
      setEmail("")
      setPassword("")
      setConfirm("")
      setFullName("")
    } catch (error: any) {
      setMessage(error.message || "Signup failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">

<header className="auth-header">
  <Image
    src="/gmu-logo.jpg"
    alt="GMU Logo"
    width={40}
    height={40}
    className="logo"
  />
  <h2 className="brand">GMUBookSwap</h2>
</header>

      {/* Signup Form */}
      <div className="auth-container">
        <h1 className="title">Create GMUBookSwap Account</h1>

        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="GMU Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        {/* Message + Link to Login */}
        <p className="message">{message}</p>
        <p>
          Already have an account?{" "}
          <Link href="/" className="login-link">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
