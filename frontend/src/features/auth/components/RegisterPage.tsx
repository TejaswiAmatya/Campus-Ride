import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Car } from 'lucide-react'
import { useRegister } from '@/features/auth/hooks/useAuth'

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const registerMutation = useRegister()

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    registerMutation.mutate(form)
  }

  return (
    <div className="mx-auto max-w-sm mt-12 px-4">
      <div className="mb-8 text-center">
        <Car className="mx-auto h-10 w-10 text-primary mb-3" />
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A university email address is required
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full name
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Alice Andersen"
            required
            minLength={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            University email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="you@university.edu"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone number <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+47 900 00 000"
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
            value={form.password}
            onChange={set('password')}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {registerMutation.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Registration failed. Check your email and try again.
          </p>
        )}

        {registerMutation.isSuccess && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Check your email to confirm your account before signing in.
          </p>
        )}

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {registerMutation.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
