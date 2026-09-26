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
              ? 'border-hairline-mid bg-soft'
              : 'border-border bg-background hover:border-hairline-mid hover:bg-soft',
          ].join(' ')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-soft">
            <Upload className="h-4 w-4 text-hairline-mid" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop your licence here, or <span className="underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-mute">JPEG, PNG, WebP, HEIC, PDF</p>
          </div>
        </button>
      )}

      {selectedFile && (
        <div className="relative flex items-center gap-4 rounded-xl bg-soft p-4">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={selectedFile.name}
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-background">
              <FileText className="h-5 w-5 text-hairline-mid" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
            <p className="mt-0.5 text-xs text-mute">
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
            className="shrink-0 rounded-pill p-1.5 text-mute transition hover:bg-background hover:text-foreground"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
