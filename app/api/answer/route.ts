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

    // Send the user's action to the thread
    await add_message_to_thread(thread_id, "user", action);
    const assistantResponse = await run_assistant(thread_id);

    if (!assistantResponse) {
      return NextResponse.json({ error: "No assistant response." }, { status: 500 });
    }

    // If the assistant wants to ask a new question, increment
    if (assistantResponse.type === "question") {
      questions_asked += 1;
    }

    // Return updated data
    return NextResponse.json({
      ...assistantResponse,
      questions_asked
    });
  } catch (error: any) {
    console.error("Error in /api/answer:", error);
    return NextResponse.json({ error: "Failed to get a response." }, { status: 500 });
  }
}