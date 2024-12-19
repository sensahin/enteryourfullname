// app/api/answer/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { add_message_to_thread, run_assistant } from '@/lib/apiHelpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    const cookieStore = await cookies();
    const thread_id = cookieStore.get('thread_id')?.value;
    if (!thread_id) {
      return NextResponse.json({ error: "No thread_id found." }, { status: 400 });
    }

    await add_message_to_thread(thread_id, "user", action);
    const assistantResponse = await run_assistant(thread_id);

    if (!assistantResponse) {
      return NextResponse.json({ error: "No assistant response." }, { status: 500 });
    }

    const response = NextResponse.json(assistantResponse);

    // If response is question, increment questions_asked
    if (assistantResponse.type === "question") {
      const current = parseInt(cookieStore.get('questions_asked')?.value || '0', 10) + 1;
      response.cookies.set('questions_asked', current.toString());
    }

    const language = assistantResponse.language || cookieStore.get('language')?.value || "en";
    response.cookies.set('language', language);

    return response;
  } catch (error: any) {
    console.error("Error in /api/answer:", error);
    return NextResponse.json({ error: "Failed to get a response." }, { status: 500 });
  }
}