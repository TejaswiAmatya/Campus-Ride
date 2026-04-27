import { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Car, Check, FileText, Upload, X } from 'lucide-react'
import { api } from '@/api/client'
import { DocumentUpload } from './components/DocumentUpload'

export function DriverRegistrationPage() {
  const [licenceFile, setLicenceFile] = useState<File | null>(null)
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null)
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
    if (!licenceFile || !insuranceFile || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('licence', licenceFile)
      formData.append('insurance', insuranceFile)
      formData.append(
        'vehicle',
        JSON.stringify({ make, model, year: Number(year), colour, plateNumber }),
      )
      await api.post('/api/users/me/driver', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setIsSubmitted(true)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          setErrorMessage('You have already submitted a driver application.')
        } else {
          setErrorMessage(
            (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
              error.message ??
              'Something went wrong. Please try again.',
          )
        }
      } else {
        setErrorMessage('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Application submitted</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Your licence, insurance, and vehicle details are with the admin team. You'll be notified once your account is approved and you can start posting rides.
          </p>
          <div className="mt-8 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left">
            {['Licence document received', 'Insurance document received', 'Vehicle details saved', 'Pending admin review'].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} />
                {item}
              </div>
            ))}
          </div>
          <Link
            to="/profile"
            className="mt-8 inline-block rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Back to profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
          <Car className="h-3.5 w-3.5" />
          Become a driver
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Apply as a driver</h1>
        <p className="mt-2 text-sm text-slate-500">
          Upload your licence, insurance, and vehicle details. An admin will review the full application before you can post rides.
        </p>
      </div>

      {/* Steps */}
      <Steps />

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        {/* Licence section */}
        <section>
          <SectionLabel number={1} title="Driver's licence" />
          <div className="mt-4">
            <DocumentUpload onFileSelect={setLicenceFile} />
          </div>
        </section>

        <section>
          <SectionLabel number={2} title="Vehicle insurance" />
          <div className="mt-4">
            <DocumentUpload onFileSelect={setInsuranceFile} />
          </div>
        </section>

        {/* Vehicle section */}
        <section>
          <SectionLabel number={3} title="Vehicle details" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Make" value={make} onChange={setMake} placeholder="Toyota" />
            <Field label="Model" value={model} onChange={setModel} placeholder="Prius" />
            <Field
              label="Year"
              value={year}
              onChange={setYear}
              placeholder="2020"
              inputMode="numeric"
            />
            <Field label="Colour" value={colour} onChange={setColour} placeholder="Silver" />
          </div>
          <div className="mt-4">
            <Field
              label="Plate number"
              value={plateNumber}
              onChange={setPlateNumber}
              placeholder="AB 12345"
              mono
            />
          </div>
        </section>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Submit */}
        <div className="border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={!licenceFile || !insuranceFile || isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? 'Submitting…' : 'Submit application'}
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">
            Your documents are handled securely and reviewed by an admin.
          </p>
        </div>
      </form>
    </div>
  )
}

function Steps() {
  const steps = ['Upload documents', 'Add vehicle', 'Submit for review']
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {i + 1}
            </div>
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="mb-5 h-px flex-1 bg-slate-200 mx-3" />
          )}
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
        {number}
      </span>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  mono?: boolean
}

function Field({ label, value, onChange, placeholder, inputMode, mono }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required
        className={[
          'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900',
          'outline-none transition placeholder:text-slate-300',
          'focus:border-slate-400 focus:ring-4 focus:ring-slate-100',
          mono ? 'font-mono tracking-wider' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </label>
  )
}
