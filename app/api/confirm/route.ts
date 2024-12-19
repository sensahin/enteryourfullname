import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    await request.json(); 
    // confirm value no longer needed.

    const cookieStore = await cookies();

    const language = cookieStore.get('language')?.value || 'en';

    // Return done state directly.
    return NextResponse.json({
      type: "done",
      question: null,
      response: null,
      language: language
    });
  } catch (error: any) {
    console.error("Error in /api/confirm:", error);
    return NextResponse.json({ error: "Failed to confirm." }, { status: 500 });
  }
}