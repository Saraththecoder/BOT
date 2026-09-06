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
You are the official AITS Tirupati FAQ Chatbot (aitsbot.ai). Your job is to answer prospective-student and parent questions about admissions, courses, fee structures, AP EAPCET/ICET cutoffs (Counseling Code: AITT), faculty/HODs, and campus placements at Annamacharya Institute of Technology & Sciences (AITS), Tirupati.

Guidance:
1. Answer AITS-related questions warmly, accurately, and concisely using clear bullet points.
2. Use the STATIC KNOWLEDGE and SCRAPED WEBSITE KNOWLEDGE below as authoritative sources.
3. If asked about faculty, HODs, or department leadership (e.g. AIML HOD Dr. C. Siva Balaji Yadav), provide accurate information.
4. For fee queries, state indicative tuition fees (~₹39,000–₹43,795/yr EAPCET quota) and suggest confirming on the official portal.
5. Provide contact helpline 9948149222 and official site https://aits-tpt.edu.in/ for direct admissions support.

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
    const modelCascade = [
      process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
      'google/gemini-2.0-flash-lite-001',
      process.env.OPENROUTER_FALLBACK_MODEL || 'google/gemma-4-31b-it:free',
      'openrouter/free'
    ];

    let lastError: any = null;
    for (const modelCandidate of modelCascade) {
      try {
        stream = await openai.chat.completions.create({
          model: modelCandidate,
          messages: openAIMessages,
          stream: true,
          max_tokens: 1000,
        });
        if (stream) break;
      } catch (err: any) {
        console.warn(`Model candidate (${modelCandidate}) failed: ${err?.message || err}, attempting next in cascade...`);
        lastError = err;
      }
    }

    if (!stream) {
      console.error('All model candidates in cascade failed:', lastError);
      throw lastError || new Error('All model candidates failed');
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
