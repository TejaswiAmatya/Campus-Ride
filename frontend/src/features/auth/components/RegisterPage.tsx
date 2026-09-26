import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Car } from 'lucide-react'
import { AuthPageLayout } from '@/features/auth/components/AuthPageLayout'
import { useRegister } from '@/features/auth/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    <AuthPageLayout>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-background">
          <Car className="h-6 w-6 text-foreground" />
        </span>
        <h1 className="font-display text-display-md text-foreground">Create your account</h1>
        <p className="text-sm text-mute">
          A university email address is required
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto w-[95%] space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
            Full name
          </label>
          <Input
            id="name"
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Alice Andersen"
            required
            minLength={2}
            className="bg-softer"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            University email
          </label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="you@university.edu"
            required
            className="bg-softer"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
            Phone number <span className="text-mute">(optional)</span>
          </label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+47 900 00 000"
            className="bg-softer"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="bg-softer"
          />
        </div>

        {registerMutation.isError && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Registration failed. Check your email and try again.
          </p>
        )}

        {registerMutation.isSuccess && (
          <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
            Check your email to confirm your account before signing in.
          </p>
        )}

        <Button type="submit" disabled={registerMutation.isPending} className="w-full">
          {registerMutation.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-mute">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </AuthPageLayout>
  )
}
