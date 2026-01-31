'use client'

import { useState } from 'react'
import {
  Plus,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Copy,
  Check,
  Info,
  Sparkles,
} from 'lucide-react'

interface CalendarInput {
  url: string
  name: string
  color: string
}

export default function CreateCollectionForm() {
  const [name, setName] = useState('')
  const [customId, setCustomId] = useState('')
  const [calendars, setCalendars] = useState<CalendarInput[]>([
    { url: '', name: 'Main Calendar', color: '#3b82f6' },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null)

  const addCalendar = () => {
    setCalendars([
      ...calendars,
      { url: '', name: `Calendar ${calendars.length + 1}`, color: '#8b5cf6' },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessUrl(null)

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          customId: customId || undefined,
          calendars: calendars.filter(c => c.url && c.name), // Filter out empty ones
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create collection')
      }

      const url = `${window.location.origin}/api/calendar/${data.guid}`
      setSuccessUrl(url)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = () => {
    if (successUrl) {
      navigator.clipboard.writeText(successUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
                setName('')
                setCustomId('')
                setCalendars([
                  { url: '', name: 'Main Calendar', color: '#3b82f6' },
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
            <label className="text-sm font-medium text-gray-300 ml-1">
              Collection Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Work & Personal"
              className="w-full px-4 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1 flex items-center gap-2">
              Custom ID
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-500 hover:text-gray-300 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-xs text-gray-300 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center shadow-xl">
                  Custom URL identifier. Leave blank for random.
                </div>
              </div>
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono group-focus-within:text-purple-400 transition-colors">
                /
              </span>
              <input
                type="text"
                value={customId}
                onChange={e =>
                  setCustomId(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  )
                }
                placeholder="my-calendar-id"
                className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-mono text-sm"
              />
            </div>
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
            {calendars.map((cal, index) => (
              <div
                key={index}
                className="group relative flex gap-3 items-start animate-in slide-in-from-left-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-1 space-y-3 p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
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
                        className="w-9 h-9 rounded-lg cursor-pointer border-2 border-white/10 shadow-sm transition-transform hover:scale-110 active:scale-95"
                        style={{ backgroundColor: cal.color }}
                        onClick={() =>
                          setActiveColorIndex(
                            activeColorIndex === index ? null : index
                          )
                        }
                      >
                        {/* Color preview */}
                      </div>
                      <input
                        type="color"
                        value={cal.color}
                        onChange={e =>
                          updateCalendar(index, 'color', e.target.value)
                        }
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-purple-400 transition-colors" />
                    <input
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
                  className={`p-3 mt-1 rounded-xl transition-all ${calendars.length > 1 ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
                  title="Remove calendar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
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
