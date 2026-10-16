'use client'

import * as React from 'react'
import {
  LiveKitRoom,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'

export type Session = {
  token: string
  serverUrl: string
  room: string
}

type MeetingProps = {
  session: Session
  onLeave: () => void
  onError: (message: string) => void
}

function JoinSound() {
  const room = useRoomContext()
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = React.useState(
    'Click Enable sound to test notifications.'
  )

  const playSound = React.useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      audio.currentTime = 0
      await audio.play()
      setStatus('Join sound is enabled.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)

      setStatus(`Sound could not play: ${message}`)
      console.error('Join sound failed:', error)
    }
  }, [])

  React.useEffect(() => {
    const audio = new Audio('/sounds/sound.mp3')
    audio.preload = 'auto'
    audio.volume = 0.7
    audioRef.current = audio

    const handleAudioError = () => {
      setStatus(
        'Cannot load sound. Check that public/sounds/sound.mp3 exists.'
      )
    }

    const handleParticipantConnected = () => {
      console.log('Another participant joined the meeting.')
      void playSound()
    }

    audio.addEventListener('error', handleAudioError)
    room.on(
      RoomEvent.ParticipantConnected,
      handleParticipantConnected
    )

    return () => {
      room.off(
        RoomEvent.ParticipantConnected,
        handleParticipantConnected
      )
      audio.removeEventListener('error', handleAudioError)
      audioRef.current = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [room, playSound])

  // return (
  //   <div
  //     style={{
  //       display: 'flex',
  //       alignItems: 'center',
  //       gap: '12px',
  //       padding: '10px 16px',
  //       background: '#222',
  //       color: '#fff',
  //       flexShrink: 0,
  //     }}
  //   >
  //     <button
  //       type="button"
  //       onClick={() => void playSound()}
  //       style={{
  //         padding: '8px 12px',
  //         background: '#fff',
  //         color: '#111',
  //         border: 'none',
  //         borderRadius: '6px',
  //         cursor: 'pointer',
  //       }}
  //     >
  //       Enable sound
  //     </button>

  //     <span role="status" style={{ fontSize: '14px' }}>
  //       {status}
  //     </span>
  //   </div>
  // )
}

export default function Meeting({
  session,
  onLeave,
  onError,
}: MeetingProps) {
  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.serverUrl}
      connect
      audio={false}
      video={false}
      onDisconnected={onLeave}
      onError={(error) => onError(error.message)}
      onMediaDeviceFailure={() =>
        onError(
          'Cannot access that device. Check browser permissions ' +
            'and whether another app is using it.'
        )
      }
      data-lk-theme="default"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* i know its not good */}
      <JoinSound />

      <div style={{ flex: 1, minHeight: 0 }}>
        <VideoConference />
      </div>
    </LiveKitRoom>
  )
}