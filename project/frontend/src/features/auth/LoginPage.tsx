import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Car } from 'lucide-react'
import { api } from '@/api/client'

interface LoginResponse {
  data: {
    access_token: string
    refresh_token: string
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await api.post<LoginResponse>('/api/users/login', credentials)
      return res.data.data
    },
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      // Invalidate the auth query so Navbar re-fetches the user profile
      queryClient.invalidateQueries({ queryKey: ['auth', 'currentUser'] })
      // redirect to the rides page
      navigate('/rides')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // validate the form 
    loginMutation.mutate({ email, password })
  }

  return (
    <div className="mx-auto max-w-sm mt-16 px-4">
      <div className="mb-8 text-center">
        <Car className="mx-auto h-10 w-10 text-primary mb-3" />
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to Campus Ride</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            University email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {loginMutation.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Invalid email or password. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
