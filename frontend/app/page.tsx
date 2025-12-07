"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { login, isAuthenticated } from "@/lib/api"
import Link from "next/link"
import Image from "next/image"
import "./auth.css"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/listing")
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setLoading(true)

    if (!email.endsWith("@gmu.edu")) {
      setMessage("You must use your Mason email address.")
      setLoading(false)
      return
    }

    try {
      // Call backend login API
      await login({ email, password })

      setMessage("Login successful! Redirecting...")

      // Get redirect URL from query params or default to /listing
      const redirect = searchParams.get('redirect') || '/listing'

      // Use router for client-side navigation
      router.push(redirect)
    } catch (error: any) {
      setMessage(error.message || "Login failed. Please try again.")
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

      <div className="auth-container">
        <h1 className="title">GMUBookSwap Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="GMU Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="message">{message}</p>
        <p>
          Don't have an account? <Link href="/signup">Sign up here</Link>
        </p>
      </div>
    </div>
  )
}
