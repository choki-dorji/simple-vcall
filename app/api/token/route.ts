import { randomUUID } from 'node:crypto'
import { AccessToken,  RoomServiceClient, } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const roomPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON.' },
      { status: 400 },
    )
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request.' },
      { status: 400 },
    )
  }

  const { name, room, action } = body as Record<string, unknown>

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 60
  ) {
    return NextResponse.json(
      { error: 'Enter a name of 1 to 60 characters.' },
      { status: 400 },
    )
  }

  if (action !== 'create' && action !== 'join') {
    return NextResponse.json(
      { error: 'Invalid action.' },
      { status: 400 },
    )
  }

  if (
    action === 'join' &&
    (typeof room !== 'string' || !roomPattern.test(room))
  ) {
    return NextResponse.json(
      { error: 'Enter a valid room ID or invitation link.' },
      { status: 400 },
    )
  }

  const serverUrl = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!serverUrl || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'The server needs LiveKit configuration.' },
      { status: 503 },
    )
  }

  // Creating generates a new room ID.
  // Joining uses the room ID supplied by the guest.
  const roomName =
    action === 'create'
      ? randomUUID()
      : (room as string).toLowerCase()

  try {
    // Temporary diagnostic: ask LiveKit to authenticate a server request.
const apiUrl = new URL(serverUrl)
apiUrl.protocol = apiUrl.protocol === 'wss:' ? 'https:' : 'http:'

const roomService = new RoomServiceClient(
  apiUrl.toString(),
  apiKey,
  apiSecret,
)

try {
  await roomService.listRooms()

  console.log(
    '[LiveKit diagnostic] Server authentication succeeded.',
  )
} catch (error) {
  console.error(
    '[LiveKit diagnostic] Server authentication failed:',
    error instanceof Error ? error.message : 'Unknown error',
  )

  return NextResponse.json(
    {
      error:
        'LiveKit server diagnostic failed. Check the terminal output.',
    },
    { status: 502 },
  )
}
    // Each connection gets a unique participant identity.
    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: randomUUID(),
      name: name.trim(),
      ttl: '10m',
    })

    // This token only grants access to the selected room.
    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    return NextResponse.json(
      {
        token: await accessToken.toJwt(),
        serverUrl,
        room: roomName,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch {
    return NextResponse.json(
      { error: 'Could not prepare the call. Try again.' },
      { status: 500 },
    )
  }
}