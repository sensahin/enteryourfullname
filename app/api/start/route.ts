// app/api/start/route.ts

import { NextResponse } from 'next/server';
import { google_search, create_thread, run_assistant } from '@/lib/apiHelpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullname = (body.fullname || "").trim();

    // Potentially faulty calls
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

    const responseData = {
      ...assistantResponse,
      thread_id,
      questions_asked: 1,
      max_questions: '10',
      language
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    // Attempt to extract a more specific message
    let errorMessage = 'Failed to start.';
    if (error.response?.data) {
      // e.g. openai error
      errorMessage = error.response.data.error?.message || JSON.stringify(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error("Error in /api/start:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}