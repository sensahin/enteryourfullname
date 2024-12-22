import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // If none provided, fallback to 'en'
    const language = body.language || 'en';

    // Return done state in the same language
    return NextResponse.json({
      type: "done",
      question: null,
      response: null,
      language
    });
  } catch (error: any) {
    console.error("Error in /api/confirm:", error);
    return NextResponse.json({ error: "Failed to confirm." }, { status: 500 });
  }
}