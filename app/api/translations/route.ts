// app/api/translations/route.ts

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'translations.json');
    const data = readFileSync(filePath, 'utf-8');
    return new NextResponse(data, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("Error loading translations.json:", error);
    return NextResponse.json({ error: "Failed to load translations." }, { status: 500 });
  }
}