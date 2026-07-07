'use client'

import { useState } from 'react'
import {
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react'
import { trackEvent } from '../lib/gtag'

interface CalendarInput {
  id: string
  url: string
  name: string
  color: string
}

let calendarRowIdCounter = 0

function createCalendarRowId(): string {
  calendarRowIdCounter += 1
  return `cal-${Date.now()}-${calendarRowIdCounter}`
}

export default function CreateCollectionForm() {
  const [name, setName] = useState('')
  const [customId, setCustomId] = useState('')
  const [calendars, setCalendars] = useState<CalendarInput[]>([
    {
      id: createCalendarRowId(),
      url: '',
      name: 'Main Calendar',
      color: '#3b82f6',
    },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customIdError, setCustomIdError] = useState<string | null>(null)
  const [calendarErrors, setCalendarErrors] = useState<Record<string, string>>(
    {}
  )
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [successGuid, setSuccessGuid] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const addCalendar = () => {
    setCalendars([
      ...calendars,
      {
        id: createCalendarRowId(),
        url: '',
        name: `Calendar ${calendars.length + 1}`,
        color: '#8b5cf6',
      },
    ])
  }

  const removeCalendar = (index: number) => {
    setCalendars(calendars.filter((_, i) => i !== index))
  }

  const updateCalendar = (
    index: number,
    field: keyof CalendarInput,
    value: string
  ) => {
    const newCalendars = [...calendars]
    newCalendars[index] = {
      ...newCalendars[index],
      [field]: value,
    } as CalendarInput
    setCalendars(newCalendars)
  }

  /**
   * Parses the "Calendar validation failed" details array returned by the
   * API. Each entry looks like "Calendar 2 (My Cal): reason" and is matched
   * back to its row by 1-based position.
   */
  const applyCalendarValidationErrors = (details: string[]) => {
    const errorsByIndex: Record<string, string> = {}
    details.forEach(detail => {
      const match = detail.match(/^Calendar (\d+)[^:]*:\s*(.*)$/)
      const rowNumber = match?.[1]
      if (match && rowNumber) {
        const rowIndex = parseInt(rowNumber, 10) - 1
        const row = calendars[rowIndex]
        if (row) {
          errorsByIndex[row.id] = match[2] || detail
        }
      }
    })
    setCalendarErrors(errorsByIndex)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setCustomIdError(null)
    setCalendarErrors({})
    setSuccessUrl(null)

    const calendarCount = calendars.filter(c => c.url && c.name).length

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          customId: customId || undefined,
          calendars: calendars
            .filter(c => c.url && c.name)
            .map(({ url, name: calName, color }) => ({
              url,
              name: calName,
              color,
            })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'COLLECTION_EXISTS') {
          setCustomIdError('That custom ID is taken — try another')
          trackEvent('collection_creation_failed', {
            error: data.error || 'COLLECTION_EXISTS',
          })
          return
        }

        if (
          Array.isArray(data.details) &&
          data.details.every((d: unknown) => typeof d === 'string')
        ) {
          applyCalendarValidationErrors(data.details)
          trackEvent('collection_creation_failed', {
            error: data.error || 'Calendar validation failed',
          })
          return
        }

        throw new Error(data.error || 'Failed to create collection')
      }

      const url = `${window.location.origin}/api/calendar/${data.guid}`
      setSuccessUrl(url)
      setSuccessGuid(data.guid)
      trackEvent('collection_created', {
        calendar_count: calendarCount,
        has_custom_id: customId ? 1 : 0,
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      trackEvent('collection_creation_failed', { error: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!successGuid) return
    if (!confirm('Delete this collection? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/collections/${successGuid}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setError('Failed to delete collection. Please try again.')
        return
      }

      setSuccessUrl(null)
      setSuccessGuid(null)
      setName('')
      setCustomId('')
      setCalendars([
        {
          id: createCalendarRowId(),
          url: '',
          name: 'Main Calendar',
          color: '#3b82f6',
        },
      ])
      trackEvent('collection_deleted')
    } catch {
      setError('Failed to delete collection. Please try again.')
    }
  }

  const copyToClipboard = () => {
    if (successUrl) {
      navigator.clipboard.writeText(successUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      trackEvent('feed_url_copied')
    }
  }

  if (successUrl) {
    return (
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 animate-in zoom-in duration-500 delay-100">
            <Check className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Collection Ready!</h2>
            <p className="text-gray-300">
              Your aggregated calendar feed has been created successfully.
            </p>
          </div>

          <div className="bg-black/40 rounded-2xl p-6 border border-white/10 flex flex-col gap-4 group transition-all hover:border-white/20 hover:bg-black/50">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <LinkIcon className="w-4 h-4" />
              <span>Subscription URL</span>
            </div>
            <div className="flex items-center gap-4">
              <code className="flex-1 font-mono text-cyan-300 text-sm break-all text-left">
                {successUrl}
              </code>
              <button
                onClick={copyToClipboard}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <button
              onClick={() => {
                setSuccessUrl(null)
                setSuccessGuid(null)
                setName('')
                setCustomId('')
                setError(null)
                setCalendars([
                  {
                    id: createCalendarRowId(),
                    url: '',
                    name: 'Main Calendar',
                    color: '#3b82f6',
                  },
                ])
              }}
              className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all hover:scale-[1.02]"
            >
              Create New
            </button>
            <a
              href={successUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-green-500/20 transition-all transform hover:scale-[1.02]"
            >
              Test Feed
            </a>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-in slide-in-from-top-2 fade-in duration-300 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div>
              {error}
            </div>
          )}

          <button
            onClick={handleDelete}
            className="w-full py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Delete this collection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
      <div className="mb-8 space-y-2">
        <h2 className="text-3xl font-display font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Create Collection
        </h2>
        <p className="text-gray-400">
          Combine multiple calendars into a single feed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
              placeholder="e.g. Work & Personal"
              className="w-full px-4 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="collection-custom-id"
              className="text-sm font-medium text-gray-300 ml-1"
            >
              Custom ID
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono group-focus-within:text-purple-400 transition-colors">
                /
              </span>
              <input
                id="collection-custom-id"
                type="text"
                value={customId}
                onChange={e => {
                  setCustomId(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  )
                  setCustomIdError(null)
                }}
                placeholder="my-calendar-id"
                aria-invalid={customIdError ? true : undefined}
                aria-describedby="collection-custom-id-hint"
                className={`w-full pl-8 pr-4 py-3.5 rounded-xl bg-black/20 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all font-mono text-sm ${
                  customIdError
                    ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                    : 'border-white/10 focus:ring-purple-500/50 focus:border-purple-500/50'
                }`}
              />
            </div>
            <p
              id="collection-custom-id-hint"
              className={`text-xs ml-1 ${customIdError ? 'text-red-400' : 'text-gray-500'}`}
            >
              {customIdError ||
                'Custom URL identifier. Leave blank for random.'}
            </p>
          </div>
        </div>

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
              const rowError = calendarErrors[cal.id]
              return (
                <div
                  key={cal.id}
                  className="group relative flex gap-3 items-start animate-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex-1 space-y-3 p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex gap-3">
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
                        aria-invalid={rowError ? true : undefined}
                        aria-describedby={
                          rowError ? `${urlFieldId}-error` : undefined
                        }
                        className={`w-full pl-10 pr-3 py-2.5 rounded-lg bg-black/20 border text-white text-sm focus:outline-none focus:bg-black/40 focus:ring-1 transition-all font-mono placeholder-gray-600 ${
                          rowError
                            ? 'border-red-500/50 focus:ring-red-500/50'
                            : 'border-white/5 focus:ring-purple-500/30'
                        }`}
                      />
                    </div>
                    {rowError && (
                      <p
                        id={`${urlFieldId}-error`}
                        className="text-xs text-red-400 pl-1"
                      >
                        {rowError}
                      </p>
                    )}
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
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-in slide-in-from-top-2 fade-in duration-300 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold text-lg shadow-lg shadow-purple-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 group"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Processing...
            </>
          ) : (
            <>
              Create Collection
              <Sparkles className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
