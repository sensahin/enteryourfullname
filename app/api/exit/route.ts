import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFileSync } from 'fs';
import { join } from 'path';

type TranslationData = {
  yes: string;
  no: string;
  done_prompt?: string;
  goodbye?: string;
  thanks?: string;
};

type Translations = {
  [languageCode: string]: TranslationData;
};

export async function GET() {
    const cookieStore = await cookies();
    const language = cookieStore.get('language')?.value || 'en';

    const filePath = join(process.cwd(), 'public', 'translations.json');
    const data = readFileSync(filePath, 'utf-8');
    const translations: Translations = JSON.parse(data);

    const langTranslations = translations[language] || translations['en'];
    return NextResponse.json({
        type: "exit",
        question: null,
        response: null,
        language: language,
        buttons: [
            langTranslations.yes || "Yes",
            langTranslations.no || "No"
        ]
    });
}