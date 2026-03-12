import { NextResponse } from 'next/server';

// Daily.co is temporarily disabled.
export async function POST() {
    return NextResponse.json({ error: 'Daily.co integration is currently disabled.' }, { status: 503 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _POST_disabled(req: Request) {
    try {
        const { roomName, isOwner, userName, userId } = await req.json();

        const apiKey = process.env.DAILY_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing DAILY_API_KEY in environment" }, { status: 500 });
        }

        if (!roomName) {
            return NextResponse.json({ error: "roomName is required to generate a token." }, { status: 400 });
        }

        const reqBody = {
            properties: {
                room_name: roomName,
                is_owner: isOwner || false, // Organizers get True, Guests get False
                user_name: userName || "Guest", // Hardcodes their name so they can't spoof it
                user_id: userId,
                // Tokens are valid for 12 hours from generation
                exp: Math.floor(Date.now() / 1000) + (12 * 3600)
            }
        };

        const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(reqBody)
        });

        const tokenData = await response.json();

        if (!response.ok) {
            console.error("Daily API Error (Tokens):", tokenData);
            return NextResponse.json({ error: tokenData.info || "Failed to generate meeting token" }, { status: response.status });
        }

        return NextResponse.json({ token: tokenData.token });
    } catch (error: any) {
        console.error("Daily Token Request Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
