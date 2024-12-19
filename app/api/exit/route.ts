// app/api/exit/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
    const cookieStore = await cookies();
    const language = cookieStore.get('language')?.value || 'en';

    // Instead of fetching from an URL, read translations from filesystem:
    const filePath = join(process.cwd(), 'public', 'translations.json');
    const data = readFileSync(filePath, 'utf-8');
    const translations = JSON.parse(data);

    return NextResponse.json({
        type: "exit",
        question: null,
        response: null,
        language: language,
        buttons: [
            (translations as any)[language]?.yes || "Yes",
            (translations as any)[language]?.no || "No"
        ]
    });
}