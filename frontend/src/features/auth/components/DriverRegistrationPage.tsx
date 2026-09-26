import { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Car, Check, X } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DocumentUpload } from './DocumentUpload'

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
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-pill bg-success/15">
            <Check className="h-8 w-8 text-success" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-display-md text-foreground">Application submitted</h1>
          <p className="mt-3 text-sm leading-7 text-mute">
            Your licence, insurance, and vehicle details are with the admin team. You'll be notified once your account is approved and you can start posting rides.
          </p>
          <div className="mt-8 space-y-2 rounded-xl bg-soft p-4 text-left">
            {['Licence document received', 'Insurance document received', 'Vehicle details saved', 'Pending admin review'].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                <Check className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
                {item}
              </div>
            ))}
          </div>
          <Button asChild className="mt-8">
            <Link to="/profile">Back to profile</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-pill bg-soft px-3 py-1 text-xs font-medium text-hairline-mid">
          <Car className="h-3.5 w-3.5" />
          Become a driver
        </div>
        <h1 className="font-display text-display-lg text-foreground">Apply as a driver</h1>
        <p className="mt-2 text-sm text-mute">
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
          <div className="flex items-start gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Submit */}
        <div className="border-t border-border pt-6">
          <Button
            type="submit"
            disabled={!licenceFile || !insuranceFile || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting…' : 'Submit application'}
          </Button>
          <p className="mt-3 text-center text-xs text-mute">
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
            <div className="flex h-7 w-7 items-center justify-center rounded-pill bg-primary text-xs font-semibold text-primary-foreground">
              {i + 1}
            </div>
            <span className="whitespace-nowrap text-xs font-medium text-hairline-mid">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="mb-5 mx-3 h-px flex-1 bg-border" />
          )}
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-soft text-xs font-semibold text-hairline-mid">
        {number}
      </span>
      <h2 className="font-display text-display-sm text-foreground">{title}</h2>
      <div className="h-px flex-1 bg-border" />
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
      <span className="text-xs font-medium text-mute">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        required
        className={mono ? 'font-mono tracking-wider' : undefined}
      />
    </label>
  )
}
