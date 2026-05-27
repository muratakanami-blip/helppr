import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server. Please check environment variables.' },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt parameter is required.' },
        { status: 400 }
      );
    }

    const maxRetries = 3;
    let attempt = 0;
    let responseText = '';

    while (attempt <= maxRetries) {
      try {
        const body = {
          contents: [{ parts: [{ text: prompt }] }]
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );

        if (res.status === 503 || res.status === 429) {
          attempt++;
          if (attempt <= maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            continue;
          }
          throw new Error('Gemini API is busy or overloaded. Please try again in a few moments.');
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `Gemini API returned status ${res.status}`);
        }

        const data = await res.json();
        responseText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';

        if (!responseText) {
          throw new Error('Empty response received from Gemini API.');
        }
        
        break; // Success
      } catch (e) {
        if (attempt >= maxRetries) {
          throw e;
        }
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error('Error scoring press release:', error);
    return NextResponse.json(
      { error: error.message || 'An internal error occurred while scoring the press release.' },
      { status: 500 }
    );
  }
}
