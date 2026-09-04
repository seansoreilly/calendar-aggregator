'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Loader2,
  Copy,
  Check,
  KeyRound,
  Save,
  Trash2,
} from 'lucide-react'
import { PublicCollectionResponse } from '../types/calendar'
import {
  CalendarRow,
  FIELD_CLASS,
  createRowId,
  tokenStorageKey,
} from '../lib/collection-form'
import { useCopyToClipboard } from '../lib/use-copy-to-clipboard'
import { CalendarSourceRow } from './calendar-source-row'

interface ManageCollectionFormProps {
  guid: string
}

function sourceToRow(
  source: PublicCollectionResponse['calendars'][number]
): CalendarRow {
  return {
    id: createRowId('row'),
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
  const [reloadKey, setReloadKey] = useState(0)
  const [token, setToken] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [calendars, setCalendars] = useState<CalendarRow[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copied, copyFeedUrl] = useCopyToClipboard()

  useEffect(() => {
    const stored = window.localStorage.getItem(tokenStorageKey(guid))
    // Syncing from localStorage after mount is intentional: reading it in a
    // lazy initialiser would cause a server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setToken(stored)
  }, [guid])

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      setLoadState('loading')
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

        const data: PublicCollectionResponse = await response.json()
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
  }, [guid, reloadKey])

  const handleTokenChange = (value: string): void => {
    setToken(value)
    window.localStorage.setItem(tokenStorageKey(guid), value)
  }

  const addCalendar = (): void => {
    setCalendars([
      ...calendars,
      {
        id: createRowId('row'),
        url: '',
        name: `Calendar ${calendars.length + 1}`,
        color: '#3f7d58',
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

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
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
        setError('That management token is not valid for this collection.')
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

      const data: PublicCollectionResponse = await response.json()
      setName(data.name)
      setDescription(data.description || '')
      setCalendars(data.calendars.map(sourceToRow))
      setSuccessMessage('Changes saved.')
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
        setError('That management token is not valid for this collection.')
        return
      }

      if (response.status === 404) {
        setLoadState('not-found')
        return
      }

      if (!response.ok) {
        setError('Could not delete the collection. Try again.')
        return
      }

      window.localStorage.removeItem(tokenStorageKey(guid))
      router.push('/')
    } catch {
      setError('Could not delete the collection. Try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const feedUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/calendar/${guid}`
      : ''

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 border-2 border-ink bg-sheet p-8 text-sm text-graphite">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading collection
      </div>
    )
  }

  if (loadState === 'not-found') {
    return (
      <div className="border-2 border-ink bg-sheet p-8">
        <h2 className="font-display text-lg font-bold text-ink">
          Collection not found
        </h2>
        <p className="mt-2 max-w-md text-sm text-graphite">
          No collection exists for this ID. It may have been deleted, or the
          link may have a typo.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-85"
        >
          Create a collection
        </Link>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="space-y-4 border-2 border-ink bg-sheet p-8 text-center">
        <h2 className="font-display text-lg font-bold text-ink">
          Something went wrong
        </h2>
        <p className="text-sm text-graphite">
          Failed to load this collection. Try again later.
        </p>
        <button
          type="button"
          onClick={() => setReloadKey(k => k + 1)}
          className="inline-block border border-ink px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="border-2 border-ink bg-sheet">
      <div className="border-b border-rule px-6 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
          Edit collection
        </h2>
      </div>

      <div className="space-y-8 p-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-graphite">
            Subscription URL
          </p>
          <div className="mt-2 flex items-stretch border border-rule bg-paper">
            <code className="flex-1 break-all px-3 py-3 font-mono text-sm text-stamp">
              {feedUrl}
            </code>
            <button
              type="button"
              onClick={() => copyFeedUrl(feedUrl)}
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
        </div>

        <div>
          <label
            htmlFor="management-token"
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-graphite"
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            Management token
          </label>
          <input
            id="management-token"
            type="text"
            value={token}
            onChange={e => handleTokenChange(e.target.value)}
            placeholder="Paste your management token"
            className={`mt-2 font-mono ${FIELD_CLASS}`}
          />
          <p className="mt-1.5 text-xs text-graphite">
            Required to save or delete this collection. It was shown once when
            the collection was created.
          </p>
        </div>

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
              className={`mt-2 ${FIELD_CLASS}`}
            />
          </div>
          <div>
            <label
              htmlFor="collection-description"
              className="font-mono text-[11px] uppercase tracking-wider text-graphite"
            >
              Description
            </label>
            <input
              id="collection-description"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              className={`mt-2 ${FIELD_CLASS}`}
            />
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
                showEnabled
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

        {successMessage && (
          <p
            role="status"
            className="flex items-center gap-2 border-l-2 border-ink py-1 pl-4 text-sm text-ink"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {successMessage}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 border-t border-rule pt-6 sm:grid-cols-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-ink py-3.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-paper transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save changes
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 border border-today py-3.5 text-sm font-semibold text-today transition-colors hover:bg-today hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Deleting
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete collection
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
