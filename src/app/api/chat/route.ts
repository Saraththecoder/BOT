import { NextResponse } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getCache } from '@/lib/kv';
import { STATIC_KNOWLEDGE } from '@/lib/staticKnowledge';
import { openai } from '@/lib/gemini';

const rateLimitMap = new Map<string, number>();
const MAX_MESSAGES_PER_SESSION = 20;

export async function POST(req: Request) {
  try {
    const { messages, sessionId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Rate Limiting Check
    const currentCount = rateLimitMap.get(sessionId) || 0;
    if (currentCount >= MAX_MESSAGES_PER_SESSION) {
      return new NextResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'We\'re getting a lot of questions right now — please try again in a moment, or call the admissions office at 9948149222.'
              )
            );
            controller.close();
          },
        }),
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }
    rateLimitMap.set(sessionId, currentCount + 1);

    // Fetch scraped data
    let scrapedDataText = '';
    try {
      const cacheData = await getCache('aits_scraped_data');
      if (cacheData && cacheData.lastFullRunSuccess && cacheData.pages) {
        // Concatenate all page texts
        scrapedDataText = Object.values(cacheData.pages)
          .map((page: any) => page.text)
          .join('\n\n---\n\n');
      }
    } catch (err) {
      console.error('KV Read Error:', err);
    }

    // Construct System Prompt
    const systemPrompt = `
You are the official AITS Tirupati FAQ Chatbot. Your job is to answer prospective-student questions about admissions, courses, fees, and placements.
Answer ONLY AITS-related questions. If a question is entirely unrelated to AITS or colleges, politely decline to answer.
Never invent numbers not present in the provided context. If unsure, direct the user to call 9948149222 or visit the official site.
Be concise, use bullet points for lists, and use a warm and encouraging tone (you are often talking to a stressed 12th-grader or parent).

### STATIC KNOWLEDGE (Always Accurate):
${STATIC_KNOWLEDGE}

### SCRAPED WEBSITE KNOWLEDGE (Recent Updates):
${scrapedDataText ? scrapedDataText : 'No additional scraped data available.'}
    `;

    // Map messages for OpenAI format
    const openAIMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: String(msg.content || '')
      }))
    ];

    let stream;
    const primaryModel = process.env.OPENROUTER_MODEL || 'openrouter/free';
    const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'google/gemma-4-31b-it:free';

    try {
      stream = await openai.chat.completions.create({
        model: primaryModel,
        messages: openAIMessages,
        stream: true,
        max_tokens: 1000,
      });
    } catch (error: any) {
      console.warn(`Primary model (${primaryModel}) failed: ${error?.message || error}, falling back to ${fallbackModel}`);
      try {
        stream = await openai.chat.completions.create({
          model: fallbackModel,
          messages: openAIMessages,
          stream: true,
          max_tokens: 1000,
        });
      } catch (fallbackError: any) {
        console.error(`Fallback model (${fallbackModel}) also failed:`, fallbackError);
        throw fallbackError;
      }
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // @ts-ignore - stream is definitely assigned here
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (error) {
          console.error('OpenAI Stream Error:', error);
          controller.enqueue(encoder.encode('\n\n[An error occurred while generating the response. Please try again.]'));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return new NextResponse(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'We\'re getting a lot of questions right now — please try again in a moment, or call the admissions office at 9948149222.'
            )
          );
          controller.close();
        },
      }),
      { headers: { 'Content-Type': 'text/plain' } }
    );
  }
}
