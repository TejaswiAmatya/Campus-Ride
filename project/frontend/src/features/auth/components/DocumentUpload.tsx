import { useEffect, useId, useRef, useState } from 'react'
import { FileText, ImageUp, Upload, X } from 'lucide-react'

interface DocumentUploadProps {
  onFileSelect: (file: File) => void
}

const acceptedTypes = '.jpg,.jpeg,.png,.webp,.heic,.pdf'
const previewableMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const filenameOnlyMimeTypes = new Set(['image/heic', 'application/pdf'])

export function DocumentUpload({ onFileSelect }: DocumentUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!selectedFile || !previewableMimeTypes.has(selectedFile.type)) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedFile])

  const selectFile = (file: File | null) => {
    if (!file) return
    setSelectedFile(file)
    onFileSelect(file)
  }

  const openPicker = () => {
    inputRef.current?.click()
  }

  const resetSelection = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={acceptedTypes}
        className="sr-only"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        onClick={openPicker}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          selectFile(event.dataTransfer.files?.[0] ?? null)
        }}
        className={[
          'group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border px-6 py-8 text-left transition duration-300',
          'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.36),transparent_48%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,41,59,0.93))]',
          'shadow-[0_24px_60px_rgba(15,23,42,0.28)]',
          isDragging
            ? 'border-amber-300/80 ring-4 ring-amber-200/30'
            : 'border-white/15 hover:border-amber-200/50',
        ].join(' ')}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(251,191,36,0.12),transparent)] opacity-0 transition duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-sky-300/10 blur-3xl" />

        <div className="relative flex flex-col items-center gap-4 text-center text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/8 backdrop-blur-sm">
            <Upload className="h-7 w-7 text-amber-200" />
          </div>
          <div className="space-y-2">
            <p className="font-serif text-2xl tracking-[0.08em] text-white">Drop your licence file here</p>
            <p className="max-w-md text-sm leading-6 text-slate-200/80">
              JPEG, PNG, WebP, HEIC, or PDF. Click to browse if you would rather choose it manually.
            </p>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-amber-100">
            Secure document intake
          </div>
        </div>
      </button>

      {selectedFile && (
        <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <button
            type="button"
            onClick={resetSelection}
            className="absolute right-3 top-3 rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition hover:text-slate-900"
            aria-label="Remove selected file"
          >
            <X className="h-4 w-4" />
          </button>

          {previewUrl ? (
            <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
              <div className="overflow-hidden rounded-[1.1rem] border border-slate-200 bg-slate-100">
                <img src={previewUrl} alt={selectedFile.name} className="h-44 w-full object-cover" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <ImageUp className="h-4 w-4 text-amber-600" />
                  Preview ready
                </div>
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-[1.1rem] bg-slate-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">
                  {filenameOnlyMimeTypes.has(selectedFile.type) ? 'Stored as document file' : 'File selected'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
