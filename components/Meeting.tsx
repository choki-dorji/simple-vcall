'use client'

import {
  LiveKitRoom,
  VideoConference,
} from '@livekit/components-react'

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
            'and whether another app is using it.',
        )
      }
      data-lk-theme="default"
      style={{
        height: '100%',
        minHeight: 0,
      }}
    >
      <VideoConference />
    </LiveKitRoom>
  )
}