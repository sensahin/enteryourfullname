import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
    const filePath = join(process.cwd(), 'public', 'translations.json');
    const data = readFileSync(filePath, 'utf-8');
    return new NextResponse(data, {
        headers: { 'Content-Type': 'application/json' }
    });
}