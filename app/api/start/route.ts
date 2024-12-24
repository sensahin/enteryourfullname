// app/api/start/route.ts

import { NextResponse } from 'next/server';
import { google_search, create_thread, run_assistant } from '@/lib/apiHelpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullname = (body.fullname || "").trim();

    // 1) Normal "web" search
    const webSearch = await google_search(fullname, undefined, undefined, 10, "web");
    // 2) Image search
    const imageSearch = await google_search(fullname, undefined, undefined, 10, "image");

    // Feed only the text portion to the assistant
    const backgroundText = webSearch.text;

    // Create thread
    const thread = await create_thread([
      {
        role: "user",
        content: "Below are some background details:\n" + backgroundText
      },
      {
        role: "user",
        content: `Please start by asking a yes/no question to identify which one of these matches me. My name: ${fullname}`
      }
    ]);

    const thread_id = thread.id;

    // Run the assistant for the first question
    const assistantResponse = await run_assistant(thread_id);

    if (!assistantResponse) {
      return NextResponse.json({ error: "No assistant response." }, { status: 500 });
    }

    const language = assistantResponse?.language || 'en';

    // Return the assistant's JSON plus the image links
    const responseData = {
      ...assistantResponse,
      thread_id,
      questions_asked: 1,
      max_questions: '10',
      language,
      images: imageSearch.images  // <-- pass images to frontend
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    let errorMessage = 'Failed to start.';
    if (error.response?.data) {
      errorMessage = error.response.data.error?.message || JSON.stringify(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error("Error in /api/start:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}