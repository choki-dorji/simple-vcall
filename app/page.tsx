'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type {Session} from '@/components/Meeting'
import styles from './page.module.css'

const Meeting = dynamic(
  () => import('@/components/Meeting'),
  {
    ssr: false,
    loading: () => (
      <p className={styles.notice}>
        Loading meeting controls...
      </p>
    ),
  },
)

function roomFromInput(value: string) {
  const trimmed = value.trim()

  try {
    const url = new URL(trimmed)
    return url.searchParams.get('room') ?? trimmed
  } catch {
    return trimmed
  }
}

export default function Page() {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [session, setSession] = useState<Session | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [invite, setInvite] = useState('')

  const pending = useRef(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    setRoom(url.searchParams.get('room') ?? '')
  }, [])

  async function enter(action: 'create' | 'join') {
    if (pending.current) return

    if (!name.trim()) {
      setError('Enter your display name first.')
      return
    }

    pending.current = true
    setBusy(true)
    setError('')
    setNotice('')

    const controller = new AbortController()

    const timeout = setTimeout(
      () => controller.abort(),
      15000,
    )

    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          name,
          room: roomFromInput(room),
        }),
        signal: controller.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ?? 'Could not join the room.',
        )
      }

      if (!data.token || !data.serverUrl || !data.room) {
        throw new Error('Invalid response from the server.')
      }

      const url = new URL(window.location.href)
      url.searchParams.set('room', data.room)

      window.history.replaceState(
        null,
        '',
        url.toString(),
      )

      setInvite(url.toString())
      setRoom(data.room)
      setSession(data)
    } catch (err) {
      if (
        err instanceof Error &&
        err.name === 'AbortError'
      ) {
        setError('The request timed out. Please try again.')
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not connect.',
        )
      }
    } finally {
      clearTimeout(timeout)
      pending.current = false
      setBusy(false)
    }
  }

  function leave() {
    // Unmounting LiveKitRoom disconnects the participant.
    setSession(null)

    setNotice(
      'You left the meeting. You can join the same room again below.',
    )
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(invite)
      setNotice('Invitation link copied.')
    } catch {
      setNotice(
        'Copy the invitation link from the field above.',
      )
    }
  }

  if (session) {
    return (
      <main className={styles.call}>
        <header className={styles.header}>
          <strong className={styles.brand}>
            Chatolameet
          
          </strong>

          <label className={styles.invite}>
            Invitation link

            <input
              aria-label="Invitation link"
              readOnly
              value={invite}
              onFocus={(event) =>
                event.currentTarget.select()
              }
            />
          </label>

          <button
            className={styles.button}
            onClick={copyInvite}
          >
            Copy link
          </button>

          <button
            className={styles.secondary}
            onClick={leave}
          >
            Leave
          </button>
        </header>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.meeting}>
          <Meeting
            session={session}
            onLeave={leave}
            onError={setError}
          />
        </div>
      </main>
    )
  }

  return (
    <main className={styles.lobby}>
      <section className={styles.card}>
        <p className={styles.brand}>chatolameet</p>

        <h1>Create a room. Meet together.</h1>

        <p>
          Start a video call and share the invitation
          link with your participants.
        </p>

        <label className={styles.field}>
          Your display name

          <input
            value={name}
            maxLength={60}
            autoComplete="nickname"
            placeholder="Choki Dorji"
            onChange={(event) =>
              setName(event.target.value)
            }
          />
        </label>

        <button
          className={styles.button}
          disabled={busy}
          onClick={() => enter('create')}
        >
          {busy ? 'Please wait...' : 'Create a new room'}
        </button>

        <div className={styles.divider}>
          Or join an existing room
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void enter('join')
          }}
        >
          <label className={styles.field}>
            Room ID or invitation link

            <input
              value={room}
              placeholder="Paste the room ID or link"
              onChange={(event) =>
                setRoom(event.target.value)
              }
              required
            />
          </label>

          <button
            className={styles.secondary}
            disabled={busy || !room.trim()}
            type="submit"
          >
            Join room
          </button>
        </form>

        <p className={styles.small}>
          You enter with camera and microphone off.
          Turn them on using the meeting controls
          when ready.
        </p>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
      </section>
    </main>
  )
}