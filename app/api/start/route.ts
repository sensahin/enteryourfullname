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
        content: "Below are some background details:\n" + (await search_results)
      },
      {
        role: "user",
        content: `Please start by asking a yes/no question to identify which one of these matches me. My name: ${fullname}`
      }
    ]);

    const thread_id = thread.id;

    const assistantResponse = await run_assistant(thread_id);

    if (!assistantResponse) {
      return NextResponse.json({ error: "No assistant response." }, { status: 500 });
    }

    const language = assistantResponse?.language || 'en';

    // Return the data we want to store in localStorage
    const responseData = {
      ...assistantResponse,
      thread_id,        // so client can store it
      questions_asked: 1,  // start with 1
      max_questions: '10', // sample
      language
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Error in /api/start:", error);
    return NextResponse.json({ error: "Failed to start." }, { status: 500 });
  }
}