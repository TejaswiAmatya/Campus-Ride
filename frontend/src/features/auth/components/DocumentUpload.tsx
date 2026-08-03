import { useEffect, useId, useRef, useState } from 'react'
import { FileText, ImageIcon, Upload, X } from 'lucide-react'

interface DocumentUploadProps {
  onFileSelect: (file: File) => void
}

const acceptedTypes = '.jpg,.jpeg,.png,.webp,.heic,.pdf'
const previewableMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

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
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  const selectFile = (file: File | null) => {
    if (!file) return
    setSelectedFile(file)
    onFileSelect(file)
  }

  const reset = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={acceptedTypes}
        className="sr-only"
        onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
      />

      {!selectedFile && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            selectFile(e.dataTransfer.files?.[0] ?? null)
          }}
          className={[
            'flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
            isDragging
              ? 'border-slate-400 bg-slate-50'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
          ].join(' ')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Upload className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Drop your licence here, or <span className="text-blue-600">browse</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">JPEG, PNG, WebP, HEIC, PDF</p>
          </div>
        </button>
      )}

      {selectedFile && (
        <div className="relative flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={selectedFile.name}
              className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <FileText className="h-5 w-5 text-slate-500" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{selectedFile.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {previewUrl ? (
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Image preview ready
                </span>
              ) : (
                `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
