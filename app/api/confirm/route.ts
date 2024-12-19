import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: Request) {
    await request.json(); 
    // We no longer need the confirm value since we do the same action regardless of yes/no.

    const cookieStore = await cookies();
    const language = cookieStore.get('language')?.value || 'en';

    // Read translations from filesystem
    const filePath = join(process.cwd(), 'public', 'translations.json');
    const data = readFileSync(filePath, 'utf-8');
    const translations = JSON.parse(data);

    // Return "done" state without further OpenAI calls
    return NextResponse.json({
        type: "done",
        question: null,
        response: null,
        language: language
    });
}