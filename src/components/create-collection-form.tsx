'use client'

import { useState } from 'react'
import { Plus, Loader2, Copy, Check, KeyRound } from 'lucide-react'
import { trackEvent } from '../lib/gtag'
import {
  CalendarRow,
  FIELD_CLASS,
  createEmptyCalendarRow,
  tokenStorageKey,
} from '../lib/collection-form'
import { useCopyToClipboard } from '../lib/use-copy-to-clipboard'
import { CalendarSourceRow } from './calendar-source-row'
import { ApiErrorBody } from '../types/calendar'

interface CreateCollectionResponse {
  guid: string
  managementToken?: string
}

export default function CreateCollectionForm() {
  const [name, setName] = useState('')
  const [customId, setCustomId] = useState('')
  const [calendars, setCalendars] = useState<CalendarRow[]>([
    createEmptyCalendarRow('Main calendar', '#1b3a6b'),
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customIdError, setCustomIdError] = useState<string | null>(null)
  const [calendarErrors, setCalendarErrors] = useState<Record<string, string>>(
    {}
  )
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [successGuid, setSuccessGuid] = useState<string | null>(null)
  const [successToken, setSuccessToken] = useState<string | null>(null)
  const [copied, copyToClipboard] = useCopyToClipboard()
  const [tokenCopied, copyTokenToClipboard] = useCopyToClipboard()

  const addCalendar = () => {
    setCalendars([
      ...calendars,
      createEmptyCalendarRow(`Calendar ${calendars.length + 1}`, '#3f7d58'),
    ])
  }

  const removeCalendar = (index: number) => {
    setCalendars(calendars.filter((_, i) => i !== index))
  }

  const updateCalendar = (
    index: number,
    field: keyof CalendarRow,
    value: string | boolean
  ) => {
    const newCalendars = [...calendars]
    newCalendars[index] = {
      ...newCalendars[index],
      [field]: value,
    } as CalendarRow
    setCalendars(newCalendars)
  }

  const resetForm = () => {
    setSuccessUrl(null)
    setSuccessGuid(null)
    setSuccessToken(null)
    setName('')
    setCustomId('')
    setError(null)
    setCalendars([createEmptyCalendarRow('Main calendar', '#1b3a6b')])
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

      if (!response.ok) {
        const data: ApiErrorBody | null = await response
          .json()
          .catch(() => null)

        if (data?.code === 'COLLECTION_EXISTS') {
          setCustomIdError('That ID is taken. Try another.')
          trackEvent('collection_creation_failed', {
            error: data.error || 'COLLECTION_EXISTS',
          })
          return
        }

        if (
          Array.isArray(data?.details) &&
          data.details.every((d: unknown) => typeof d === 'string')
        ) {
          applyCalendarValidationErrors(data.details)
          trackEvent('collection_creation_failed', {
            error: data?.error || 'Calendar validation failed',
          })
          return
        }

        throw new Error(data?.error || 'Failed to create collection')
      }

      const data: CreateCollectionResponse = await response.json()

      const url = `${window.location.origin}/api/calendar/${data.guid}`
      setSuccessUrl(url)
      setSuccessGuid(data.guid)
      if (data.managementToken) {
        setSuccessToken(data.managementToken)
        window.localStorage.setItem(
          tokenStorageKey(data.guid),
          data.managementToken
        )
      }
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
        headers: { Authorization: `Bearer ${successToken || ''}` },
      })

      if (response.status === 401) {
        setError('That management token is not valid for this collection.')
        return
      }

      if (!response.ok) {
        setError('Could not delete the collection. Try again.')
        return
      }

      resetForm()
      trackEvent('collection_deleted')
    } catch {
      setError('Could not delete the collection. Try again.')
    }
  }

  if (successUrl) {
    return (
      <div className="border-2 border-ink bg-sheet">
        <div className="flex items-center gap-2 border-b border-rule px-6 py-3">
          <Check className="h-4 w-4 text-ink" aria-hidden="true" />
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
            Collection created
          </h2>
        </div>

        <div className="space-y-8 p-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-graphite">
              Subscription URL
            </p>
            <div className="mt-2 flex items-stretch border border-rule bg-paper">
              <code className="flex-1 break-all px-3 py-3 font-mono text-sm text-stamp">
                {successUrl}
              </code>
              <button
                onClick={() => {
                  copyToClipboard(successUrl)
                  trackEvent('feed_url_copied')
                }}
                className="shrink-0 border-l border-rule px-4 text-graphite transition-colors hover:bg-ink hover:text-paper"
                aria-label="Copy subscription URL"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-sm text-graphite">
              Add this to any calendar app as a subscribed calendar.
            </p>
          </div>

          {successToken && (
            <div className="border-l-2 border-today pl-4">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-today">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                Management token
              </p>
              <div className="mt-2 flex items-stretch border border-rule bg-paper">
                <code className="flex-1 break-all px-3 py-3 font-mono text-sm text-ink">
                  {successToken}
                </code>
                <button
                  onClick={() => copyTokenToClipboard(successToken)}
                  className="shrink-0 border-l border-rule px-4 text-graphite transition-colors hover:bg-ink hover:text-paper"
                  aria-label="Copy management token"
                >
                  {tokenCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-graphite">
                Copy this now — it is shown once. You need it to edit or delete
                the collection.
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="border-l-2 border-today py-1 pl-4 text-sm text-today"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-rule pt-6">
            <a
              href={successUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
            >
              Open the feed
            </a>
            {successGuid && (
              <a
                href={`/manage/${successGuid}`}
                className="border border-ink px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Manage collection
              </a>
            )}
            <button
              onClick={resetForm}
              className="px-5 py-2.5 text-sm font-semibold text-graphite transition-colors hover:text-ink"
            >
              Create another
            </button>
            <button
              onClick={handleDelete}
              className="ml-auto px-2 py-2.5 text-sm text-graphite transition-colors hover:text-today"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-ink bg-sheet">
      <div className="border-b border-rule px-6 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
          New collection
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="collection-name"
              className="font-mono text-[11px] uppercase tracking-wider text-graphite"
            >
              Name
            </label>
            <input
              id="collection-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Work and personal"
              className={`mt-2 ${FIELD_CLASS}`}
            />
          </div>
          <div>
            <label
              htmlFor="collection-custom-id"
              className="font-mono text-[11px] uppercase tracking-wider text-graphite"
            >
              Custom ID
            </label>
            <div className="mt-2 flex items-stretch border border-rule bg-paper focus-within:border-ink">
              <span className="flex items-center border-r border-rule px-3 font-mono text-xs text-graphite">
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
                placeholder="my-calendar"
                aria-invalid={customIdError ? true : undefined}
                aria-describedby="collection-custom-id-hint"
                className="w-full bg-transparent px-3 py-2.5 font-mono text-sm text-ink placeholder-graphite/60 focus:outline-none"
              />
            </div>
            <p
              id="collection-custom-id-hint"
              className={`mt-1.5 text-xs ${customIdError ? 'text-today' : 'text-graphite'}`}
            >
              {customIdError ||
                'Custom URL identifier — easy to guess, so treat the feed as public. Leave blank for a private random ID.'}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between border-b border-ink pb-2">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink">
              Source calendars
            </h3>
            <button
              type="button"
              onClick={addCalendar}
              className="flex items-center gap-1.5 text-sm font-semibold text-ink transition-colors hover:text-today"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add source
            </button>
          </div>

          <div className="divide-y divide-rule">
            {calendars.map((cal, index) => (
              <CalendarSourceRow
                key={cal.id}
                row={cal}
                index={index}
                onChange={updateCalendar}
                onRemove={removeCalendar}
                canRemove={calendars.length > 1}
                error={calendarErrors[cal.id]}
              />
            ))}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="border-l-2 border-today py-1 pl-4 text-sm text-today"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 bg-ink py-3.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creating
            </>
          ) : (
            'Create collection'
          )}
        </button>
      </form>
    </div>
  )
}
