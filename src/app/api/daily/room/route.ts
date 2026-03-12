import { NextResponse } from 'next/server';

// Daily.co is temporarily disabled. 
export async function POST() {
    return NextResponse.json({ error: 'Daily.co integration is currently disabled.' }, { status: 503 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _POST_disabled(req: Request) {
    try {
        const payload = await req.json();
        const { eventId, privacy = 'private', exp } = payload;

        const apiKey = process.env.DAILY_API_KEY;
        if (!apiKey) {
            console.error("Missing DAILY_API_KEY in environment variables.");
            return NextResponse.json({ error: "Daily API Key configuration missing." }, { status: 500 });
        }

        // Generate a deterministic room name using the eventId (must be unique)
        // Daily.co room names must be alphanumeric and can contain dashes
        const roomName = `ef-${eventId}`;

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

        let response = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(reqBody)
        });

        let roomData = await response.json();

        // If the room already exists, fetch the existing room details
        if (!response.ok && roomData.info?.includes("already exists")) {
            console.log(`Room ${roomName} already exists. Fetching existing room.`);
            const getResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`
                }
            });
            roomData = await getResponse.json();

            if (!getResponse.ok) {
                console.error("Daily API Error (Fetch Existing Room):", roomData);
                return NextResponse.json({ error: "Failed to retrieve existing room." }, { status: getResponse.status });
            }
        } else if (!response.ok) {
            console.error("Daily API Error (Rooms):", roomData);
            return NextResponse.json({ error: roomData.info || "Failed to create Daily room." }, { status: response.status });
        }

        return NextResponse.json({ roomUrl: roomData.url, roomName: roomData.name });
    } catch (error: any) {
        console.error("Daily Room Request Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
