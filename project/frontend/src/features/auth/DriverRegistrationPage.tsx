import { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { BadgeCheck, CarFront, FileBadge2, ShieldCheck } from 'lucide-react'
import { api } from '@/api/client'
import { DocumentUpload } from './components/DocumentUpload'

export function DriverRegistrationPage() {
  const [file, setFile] = useState<File | null>(null)
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [colour, setColour] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('licence', file)
      formData.append(
        'vehicle',
        JSON.stringify({
          make,
          model,
          year: Number(year),
          colour,
          plateNumber,
        }),
      )

      await api.post('/api/users/me/driver', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setIsSubmitted(true)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          setErrorMessage('You have already submitted a driver application')
        } else {
          setErrorMessage(
            (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
              error.message ??
              'Something went wrong while submitting your application',
          )
        }
      } else {
        setErrorMessage('Something went wrong while submitting your application')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <section className="overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-[linear-gradient(160deg,#f5fff7_0%,#eefbf4_52%,#ffffff_100%)] shadow-[0_30px_80px_rgba(16,185,129,0.12)]">
          <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-700">
                <BadgeCheck className="h-4 w-4" />
                Submission received
              </div>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl leading-tight text-slate-900 md:text-5xl">
                  Your application is under review
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  Your licence and vehicle details are now with the admin team. You will be able to post rides once your account is approved.
                </p>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Return to profile
              </Link>
            </div>

            <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-6 backdrop-blur-sm">
              <div className="space-y-4">
                {[
                  'Licence securely uploaded',
                  'Vehicle dossier created',
                  'Approval status pending admin review',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-slate-700">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(145deg,#fff8ec_0%,#f8fbff_46%,#ffffff_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.09)]">
        <div className="grid gap-10 px-5 py-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-8">
          <aside className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(155deg,#111827_0%,#1e293b_65%,#334155_100%)] px-6 py-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_38%)]" />
            <div className="relative space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-amber-100">
                  <CarFront className="h-4 w-4" />
                  Driver onboarding
                </div>
                <h1 className="font-serif text-4xl leading-tight md:text-5xl">
                  Build your driver profile like a verified travel dossier.
                </h1>
                <p className="max-w-md text-sm leading-7 text-slate-200/80">
                  Upload your licence, register your vehicle, and send a clean application package for admin review.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: FileBadge2,
                    title: 'Document-first flow',
                    body: 'Your licence file is attached directly to the application packet.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Manual approval gate',
                    body: 'Every new driver stays pending until an admin verifies the submission.',
                  },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-medium text-white">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Application packet</p>
                <h2 className="font-serif text-3xl text-slate-900">Driver registration</h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Add your vehicle details and upload a readable copy of your licence. Accepted formats include images and PDF.
                </p>
              </div>

              <DocumentUpload onFileSelect={setFile} />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Vehicle make"
                  value={make}
                  onChange={setMake}
                  placeholder="Toyota"
                />
                <Field
                  label="Vehicle model"
                  value={model}
                  onChange={setModel}
                  placeholder="Prius"
                />
                <Field
                  label="Year"
                  value={year}
                  onChange={setYear}
                  placeholder="2020"
                  inputMode="numeric"
                />
                <Field
                  label="Colour"
                  value={colour}
                  onChange={setColour}
                  placeholder="Silver"
                />
              </div>

              <Field
                label="Plate number"
                value={plateNumber}
                onChange={setPlateNumber}
                placeholder="AB12345"
              />

              {errorMessage && (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Secure upload • admin reviewed
                </p>
                <button
                  type="submit"
                  disabled={!file || isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? 'Submitting application…' : 'Submit driver application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}

function Field({ label, value, onChange, placeholder, inputMode }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required
        className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  )
}
