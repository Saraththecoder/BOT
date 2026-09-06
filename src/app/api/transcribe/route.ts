import { NextResponse } from 'next/server';
import { openai } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { audio, mimeType } = await req.json();

    if (!audio) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    // Attempt transcription with Gemini 2.0 Flash Lite via OpenRouter
    const primaryModel = 'google/gemini-2.0-flash-lite-001';
    const fallbackModel = 'google/gemini-2.0-flash-001';

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: primaryModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe the spoken speech in this audio clip into English or Telugu-English text. Return ONLY the verbatim transcribed text, nothing else. If audio is silent or unintelligible, return empty string.',
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audio,
                  format: mimeType?.includes('wav') ? 'wav' : mimeType?.includes('mp3') ? 'mp3' : 'webm',
                },
              },
            ],
          },
        ] as any,
        max_tokens: 300,
      });
    } catch (primaryErr: any) {
      console.warn(`Primary audio model (${primaryModel}) error:`, primaryErr?.message || primaryErr);
      completion = await openai.chat.completions.create({
        model: fallbackModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe the spoken speech in this audio clip into English text. Return ONLY the verbatim transcribed text, nothing else.',
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audio,
                  format: mimeType?.includes('wav') ? 'wav' : mimeType?.includes('mp3') ? 'mp3' : 'webm',
                },
              },
            ],
          },
        ] as any,
        max_tokens: 300,
      });
    }

    const transcript = completion.choices[0]?.message?.content?.trim() || '';
    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error('Transcription API exception:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
