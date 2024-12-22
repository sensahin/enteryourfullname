import { NextResponse } from 'next/server';
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const languageParam = searchParams.get('language') || 'en';

    const filePath = join(process.cwd(), 'public', 'translations.json');
    const data = readFileSync(filePath, 'utf-8');
    const translations: Translations = JSON.parse(data);

    const langTranslations = translations[languageParam] || translations['en'];

    return NextResponse.json({
      type: "exit",
      question: null,
      response: null,
      language: languageParam,
      buttons: [
        langTranslations.yes || "Yes",
        langTranslations.no || "No"
      ]
    });
  } catch (error: any) {
    let errorMessage = 'Failed to exit.';
    if (error.response?.data) {
      errorMessage = error.response.data.error?.message || JSON.stringify(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error("Error in /api/exit:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}