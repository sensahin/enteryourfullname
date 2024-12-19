import { NextResponse } from 'next/server';
import { google_search, create_thread, run_assistant } from '@/lib/apiHelpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullname = (body.fullname || "").trim();

    const search_results = await google_search(fullname);

    const thread = await create_thread([
      {
        role: "user",
        content: "Below are some background details:\n" + search_results
      },
      {
        role: "user",
        content: `Please start by asking a yes/no question to identify which one of these matches me. My name: ${fullname}`
      }
    ]);

    const thread_id = thread.id;
    const assistantResponse = await run_assistant(thread_id);
    const language = assistantResponse?.language || 'en';

    if (!assistantResponse) {
      return NextResponse.json({ error: "No assistant response." }, { status: 500 });
    }

    const response = NextResponse.json(assistantResponse);

    // Set cookies on response
    response.cookies.set('thread_id', thread_id);
    response.cookies.set('questions_asked', '1');
    response.cookies.set('max_questions', '10');
    response.cookies.set('language', language);

    return response;
  } catch (error: any) {
    console.error("Error in /api/start:", error);
    return NextResponse.json({ error: "Failed to start." }, { status: 500 });
  }
}