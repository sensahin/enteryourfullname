import { NextResponse } from 'next/server';
import { add_message_to_thread, run_assistant } from '@/lib/apiHelpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;
    const thread_id = body.thread_id;
    let questions_asked = body.questions_asked || 0;

    if (!thread_id) {
      return NextResponse.json({ error: "No thread_id provided." }, { status: 400 });
    }

    // Potentially faulty calls
    await add_message_to_thread(thread_id, "user", action);
    const assistantResponse = await run_assistant(thread_id);

    if (!assistantResponse) {
      return NextResponse.json({ error: "No assistant response." }, { status: 500 });
    }

    if (assistantResponse.type === "question") {
      questions_asked += 1;
    }

    return NextResponse.json({
      ...assistantResponse,
      questions_asked
    });
  } catch (error: any) {
    // Attempt to extract a more specific message
    let errorMessage = 'Failed to get a response.';
    if (error.response?.data) {
      errorMessage = error.response.data.error?.message || JSON.stringify(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error("Error in /api/answer:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}