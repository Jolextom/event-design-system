import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { eventId, privacy = 'private', exp } = payload;

        const apiKey = process.env.DAILY_API_KEY;
        if (!apiKey) {
            console.error("Missing DAILY_API_KEY in environment variables.");
            return NextResponse.json({ error: "Daily API Key configuration missing." }, { status: 500 });
        }

        // Generate a random room name using the event ID base to keep it traceable
        const shortId = eventId ? eventId.substring(0, 8) : "evnt";
        const roomName = `eventflow-${shortId}-${Math.random().toString(36).substring(2, 10)}`;

        const reqBody = {
            name: roomName,
            privacy: privacy, // 'private' means guests MUST have a token to enter (highly secure)
            properties: {
                exp: exp || Math.floor(Date.now() / 1000) + 86400, // Expires default in 24 hours
                enable_chat: true,
                start_video_off: true,
                start_audio_off: true
            }
        };

        const response = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(reqBody)
        });

        const roomData = await response.json();

        if (!response.ok) {
            console.error("Daily API Error (Rooms):", roomData);
            return NextResponse.json({ error: roomData.info || "Failed to stringify Daily room." }, { status: response.status });
        }

        return NextResponse.json({ roomUrl: roomData.url, roomName: roomData.name });
    } catch (error: any) {
        console.error("Daily Room Request Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
