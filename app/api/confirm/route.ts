import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: Request) {
    await request.json(); 
    // confirm value no longer needed.

    const cookieStore = await cookies();
    const language = cookieStore.get('language')?.value || 'en';

    // No need to read translations because we don't use them here.
    // Just return done state directly.
    return NextResponse.json({
        type: "done",
        question: null,
        response: null,
        language: language
    });
}