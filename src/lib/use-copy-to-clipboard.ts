import { useState } from 'react'

/**
 * Copies `text` to the clipboard and flips `copied` for 2s. `writeText` can
 * reject on non-secure origins or without permission, so failures are
 * swallowed rather than left as an unhandled rejection.
 */
export function useCopyToClipboard(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)

  const copy = (text: string): void => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return [copied, copy]
}
