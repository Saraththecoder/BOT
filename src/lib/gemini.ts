import OpenAI from 'openai';

const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '';

export const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://aits-tpt.edu.in',
    'X-Title': 'AITS FAQ Chatbot',
  },
});
