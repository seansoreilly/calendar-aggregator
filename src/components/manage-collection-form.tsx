'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Copy,
  Check,
  KeyRound,
  Save,
} from 'lucide-react'
import { CalendarSource } from '../types/calendar'

interface ManageCollectionFormProps {
  guid: string
}

interface CollectionResponse {
  guid: string
  name: string
  description?: string
  calendars: CalendarSource[]
  createdAt: string
  updatedAt?: string
}

interface CalendarRow {
  id: string
  url: string
  name: string
  color: string
  enabled: boolean
}

let rowIdCounter = 0

function createRowId(): string {
  rowIdCounter += 1
  return `row-${Date.now()}-${rowIdCounter}`
}

function tokenStorageKey(guid: string): string {
  return `calendar-aggregator:token:${guid}`
}

function sourceToRow(source: CalendarSource): CalendarRow {
  return {
    id: createRowId(),
    url: source.url,
    name: source.name,
    color: source.color,
    enabled: source.enabled,
  }
}

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'

export default function ManageCollectionForm({
  guid,
}: ManageCollectionFormProps): React.JSX.Element {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [token, setToken] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [calendars, setCalendars] = useState<CalendarRow[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(tokenStorageKey(guid))
    if (stored) setToken(stored)
  }, [guid])

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/collections/${guid}`)
        if (cancelled) return

        if (response.status === 404) {
          setLoadState('not-found')
          return
        }

        if (!response.ok) {
          setLoadState('error')
          return
        }

        const data: CollectionResponse = await response.json()
        if (cancelled) return

        setName(data.name)
        setDescription(data.description || '')
        setCalendars(data.calendars.map(sourceToRow))
        setLoadState('ready')
      } catch {
        if (!cancelled) setLoadState('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [guid])

  const handleTokenChange = (value: string): void => {
    setToken(value)
    window.localStorage.setItem(tokenStorageKey(guid), value)
  }

  const addCalendar = (): void => {
    setCalendars([
      ...calendars,
      {
        id: createRowId(),
        url: '',
        name: `Calendar ${calendars.length + 1}`,
        color: '#8b5cf6',
        enabled: true,
      },
    ])
  }

  const removeCalendar = (index: number): void => {
    setCalendars(calendars.filter((_, i) => i !== index))
  }

  const updateCalendar = (
    index: number,
    field: keyof CalendarRow,
    value: string | boolean
  ): void => {
    const next = [...calendars]
    next[index] = { ...next[index], [field]: value } as CalendarRow
    setCalendars(next)
  }

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/collections/${guid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          calendars: calendars.map(
            ({ url, name: calName, color, enabled }) => ({
              url,
              name: calName,
              color,
              enabled,
            })
          ),
        }),
      })

      if (response.status === 401) {
        setError('Invalid or missing management token')
        return
      }

      if (response.status === 404) {
        setLoadState('not-found')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save changes')
      }

      const data: CollectionResponse = await response.json()
      setName(data.name)
      setDescription(data.description || '')
      setCalendars(data.calendars.map(sourceToRow))
      setSuccessMessage('Changes saved successfully.')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save changes'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm('Delete this collection? This cannot be undone.'))
      return

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/collections/${guid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 401) {
        setError('Invalid or missing management token')
        return
      }

      if (response.status === 404) {
        setLoadState('not-found')
        return
      }

      if (!response.ok) {
        setError('Failed to delete collection. Please try again.')
        return
      }

      window.localStorage.removeItem(tokenStorageKey(guid))
      router.push('/')
    } catch {
      setError('Failed to delete collection. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const feedUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/calendar/${guid}`
      : ''

  const copyFeedUrl = (): void => {
    if (!feedUrl) return
    navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loadState === 'loading') {
    return (
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl flex items-center justify-center gap-3 text-gray-300">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading collection...
      </div>
    )
  }

  if (loadState === 'not-found') {
    return (
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center space-y-3">
        <h2 className="text-2xl font-bold text-white">Collection not found</h2>
        <p className="text-gray-400">
          No collection exists for this ID. It may have been deleted.
        </p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl text-center space-y-3">
        <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
        <p className="text-gray-400">
          Failed to load this collection. Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl space-y-8">
      {/* Feed URL */}
      <div className="bg-black/40 rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <LinkIcon className="w-4 h-4" />
          <span>Subscription URL</span>
        </div>
        <div className="flex items-center gap-4">
          <code className="flex-1 font-mono text-cyan-300 text-sm break-all text-left">
            {feedUrl}
          </code>
          <button
            type="button"
            onClick={copyFeedUrl}
            className="p-3 hover:bg-white/10 rounded-xl transition-all text-gray-300 hover:text-white hover:scale-105 active:scale-95"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Management token */}
      <div className="space-y-2">
        <label
          htmlFor="management-token"
          className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2"
        >
          <KeyRound className="w-4 h-4 text-amber-400" />
          Management token
        </label>
        <input
          id="management-token"
          type="text"
          value={token}
          onChange={e => handleTokenChange(e.target.value)}
          placeholder="Paste your management token"
          className="w-full px-4 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-mono text-sm"
        />
        <p className="text-xs text-gray-500 ml-1">
          Required to save or delete this collection. It was shown once when the
          collection was created.
        </p>
      </div>

      {/* Name / description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label
            htmlFor="collection-name"
            className="text-sm font-medium text-gray-300 ml-1"
          >
            Collection Name
          </label>
          <input
            id="collection-name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="collection-description"
            className="text-sm font-medium text-gray-300 ml-1"
          >
            Description
          </label>
          <input
            id="collection-description"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full px-4 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
          />
        </div>
      </div>

      {/* Source calendars */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
            Source Calendars
          </label>
          <button
            type="button"
            onClick={addCalendar}
            className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 text-sm font-medium flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Source
          </button>
        </div>

        <div className="space-y-3">
          {calendars.map((cal, index) => {
            const nameFieldId = `calendar-name-${cal.id}`
            const urlFieldId = `calendar-url-${cal.id}`
            const enabledFieldId = `calendar-enabled-${cal.id}`
            return (
              <div
                key={cal.id}
                className="group relative flex gap-3 items-start"
              >
                <div className="flex-1 space-y-3 p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <label htmlFor={nameFieldId} className="sr-only">
                        Calendar Name
                      </label>
                      <input
                        id={nameFieldId}
                        type="text"
                        required
                        value={cal.name}
                        onChange={e =>
                          updateCalendar(index, 'name', e.target.value)
                        }
                        placeholder="Calendar Name"
                        className="w-full px-3 py-2 rounded-lg bg-transparent border-b border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder-gray-600"
                      />
                    </div>
                    <div className="relative">
                      <div
                        className="w-9 h-9 rounded-lg border-2 border-white/10 shadow-sm transition-transform pointer-events-none"
                        style={{ backgroundColor: cal.color }}
                      >
                        {/* Color preview */}
                      </div>
                      <input
                        type="color"
                        value={cal.color}
                        onChange={e =>
                          updateCalendar(index, 'color', e.target.value)
                        }
                        aria-label={`Color for ${cal.name || 'calendar'}`}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                    <label
                      htmlFor={enabledFieldId}
                      className="flex items-center gap-2 text-xs text-gray-400 select-none cursor-pointer"
                    >
                      <input
                        id={enabledFieldId}
                        type="checkbox"
                        checked={cal.enabled}
                        onChange={e =>
                          updateCalendar(index, 'enabled', e.target.checked)
                        }
                        className="w-4 h-4 rounded accent-purple-500"
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="relative">
                    <label htmlFor={urlFieldId} className="sr-only">
                      Calendar URL
                    </label>
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      id={urlFieldId}
                      type="url"
                      required
                      value={cal.url}
                      onChange={e =>
                        updateCalendar(index, 'url', e.target.value)
                      }
                      placeholder="https://calendar.google.com/..."
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-black/20 border border-white/5 text-white text-sm focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-purple-500/30 transition-all font-mono placeholder-gray-600"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeCalendar(index)}
                  disabled={calendars.length <= 1}
                  className={`p-3 mt-1 rounded-xl transition-all ${
                    calendars.length > 1
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 cursor-pointer'
                      : 'opacity-30 cursor-not-allowed text-gray-500'
                  }`}
                  title="Remove calendar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm flex items-center gap-3">
          <Check className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold shadow-lg shadow-purple-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" /> Save Changes
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-6 py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 hover:text-red-200 font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isDeleting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-5 h-5" /> Delete Collection
            </>
          )}
        </button>
      </div>
    </div>
  )
}
