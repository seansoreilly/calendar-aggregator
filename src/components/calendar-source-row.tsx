import { Trash2 } from 'lucide-react'
import { CalendarRow, FIELD_CLASS } from '../lib/collection-form'

interface CalendarSourceRowProps {
  row: CalendarRow
  index: number
  onChange: (
    index: number,
    field: keyof CalendarRow,
    value: string | boolean
  ) => void
  onRemove: (index: number) => void
  canRemove: boolean
  error?: string | undefined
  showEnabled?: boolean
}

export function CalendarSourceRow({
  row,
  index,
  onChange,
  onRemove,
  canRemove,
  error,
  showEnabled = false,
}: CalendarSourceRowProps) {
  const nameFieldId = `calendar-name-${row.id}`
  const urlFieldId = `calendar-url-${row.id}`
  const enabledFieldId = `calendar-enabled-${row.id}`

  return (
    <div className="flex items-start gap-3 py-4">
      <span
        className="mt-3.5 w-5 shrink-0 font-mono text-[11px] text-graphite"
        aria-hidden="true"
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="relative shrink-0 focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ink">
            <div
              className="pointer-events-none h-full w-10 border border-rule"
              style={{ backgroundColor: row.color }}
            />
            <input
              type="color"
              value={row.color}
              onChange={e => onChange(index, 'color', e.target.value)}
              aria-label={`Colour for ${row.name || 'calendar'}`}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor={nameFieldId} className="sr-only">
              Calendar name
            </label>
            <input
              id={nameFieldId}
              type="text"
              required
              value={row.name}
              onChange={e => onChange(index, 'name', e.target.value)}
              placeholder="Calendar name"
              className={FIELD_CLASS}
            />
          </div>
          {showEnabled && (
            <label
              htmlFor={enabledFieldId}
              className="flex shrink-0 items-center gap-2 self-stretch border border-rule px-3 font-mono text-[11px] uppercase tracking-wider text-graphite"
            >
              <input
                id={enabledFieldId}
                type="checkbox"
                checked={row.enabled}
                onChange={e => onChange(index, 'enabled', e.target.checked)}
                className="h-4 w-4 accent-ink"
              />
              Enabled
            </label>
          )}
        </div>

        <div>
          <label htmlFor={urlFieldId} className="sr-only">
            Calendar URL
          </label>
          <input
            id={urlFieldId}
            type="url"
            required
            value={row.url}
            onChange={e => onChange(index, 'url', e.target.value)}
            placeholder="https://calendar.google.com/.../basic.ics"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${urlFieldId}-error` : undefined}
            className={`${FIELD_CLASS} font-mono text-xs ${error ? 'border-today' : ''}`}
          />
          {error && (
            <p id={`${urlFieldId}-error`} className="mt-1.5 text-xs text-today">
              {error}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="mt-1 shrink-0 p-2 text-graphite transition-colors hover:text-today disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-graphite"
        aria-label={`Remove calendar ${index + 1}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
