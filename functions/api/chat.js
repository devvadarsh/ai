
// Crown Code - Cloudflare Pages Function
// Endpoint: POST /api/chat
// Gemini API key must be stored as GEMINI_KEY in Cloudflare Secrets.

const MODEL = 'gemini-3.8-flash';

const SYS = `You are Crown Code, an AI assistant made ONLY for programming and software development.

You were created by Devvadarsh (also called Adarsh), the owner of Crown Lab. This project is open source under the MIT license.

CODING QUALITY RULES
- Write complete, correct, production-quality code.
- Use clear names, sensible structure, error handling, and modern best practices.
- Never use placeholders or "..." in code users must run.
- Put code in fenced blocks with the correct language name.
- Explain the key idea briefly.
- For bugs, identify the root cause and show the fix.
- Never invent APIs, libraries, or technical facts.
- Mention assumptions when relevant.
- Never expose API keys, passwords, or secrets.
- Refuse malware, harmful exploits, credential theft, and spying.

SCOPE
Only answer programming, software development, web development, databases, DevOps, algorithms, debugging, tools, and technology career coding questions.

For unrelated questions, politely explain that Crown Code specializes in programming.

ABOUT THE CREATOR
- Name: Devvadarsh, also known as Adarsh.
- Creator of Crown Code and Crown Lab.
- From Bihar, India.
- Crown Lab website: https://devvadarsh.github.io/crownlab
- GitHub: https://github.com/devvadarsh
- Crown Code is an open-source project.
- Other projects include Office Tools, SyncPit, FormFix, and Pingerr.

Only use the facts above when answering questions about the creator. Never invent personal details.`;

// Simple per-isolate rate limiter.
const hits = new Map();

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });

export async function onRequestPost({ request, env }) {
  try {
    // 1. Check API configuration.
    if (!env.GEMINI_KEY) {
      return json({
        error: 'Server configuration error: GEMINI_KEY is missing.'
      }, 500);
    }

    // 2. Validate request origin.
    const origin = request.headers.get('Origin');

    if (origin && origin !== new URL(request.url).origin) {
      return json({ error: 'Request origin not allowed.' }, 403);
    }

    // 3. Rate limiting.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = Date.now();

    const recent = (hits.get(ip) || []).filter(
      time => now - time < 60000
    );

    if (recent.length >= 12) {
      return json({
        error: 'Too many messages. Please wait one minute.'
      }, 429);
    }

    recent.push(now);
    hits.set(ip, recent);

    if (hits.size > 5000) hits.clear();

    // 4. Parse incoming request.
    let body;

    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON request.' }, 400);
    }

    if (!Array.isArray(body.contents) || body.contents.length === 0) {
      return json({ error: 'No messages were provided.' }, 400);
    }

    if (body.contents.length > 100) {
      return json({ error: 'Too many messages in one request.' }, 400);
    }

    // 5. Validate and limit conversation history.
    let total = 0;

    const contents = body.contents.slice(-24).map(message => {
      if (!message || !Array.isArray(message.parts)) {
        throw new Error('Invalid message format.');
      }

      const text = String(
        message.parts[0]?.text || ''
      ).slice(0, 6000);

      total += text.length;

      return {
        role: message.role === 'model' ? 'model' : 'user',
        parts: [{ text }]
      };
    });

    if (total > 20000) {
      return json({
        error: 'Conversation is too long. Please start a new chat.'
      }, 413);
    }

    if (contents[contents.length - 1].role !== 'user') {
      return json({
        error: 'The latest message must be from the user.'
      }, 400);
    }

    // 6. Send request to Gemini.
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

    let response;

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_KEY
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYS }]
          },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096
          }
        })
      });
    } catch (error) {
      console.error('Gemini connection failed:', error);

      return json({
        error: 'Unable to connect to Gemini. Check the network and try again.'
      }, 502);
    }

    // 7. Return actual Gemini errors for debugging.
    if (!response.ok) {
      const details = await response.text();

      let message = 'Unknown Gemini API error';

      try {
        const parsed = JSON.parse(details);
        message = parsed.error?.message || message;
      } catch {
        message = details.slice(0, 500) || message;
      }

      console.error(
        'Gemini API response:',
        response.status,
        message
      );

      if (response.status === 400) {
        return json({
          error: `Gemini rejected the request: ${message}`
        }, 400);
      }

      if (response.status === 401 || response.status === 403) {
        return json({
          error: `Gemini authentication or permission error: ${message}`
        }, response.status);
      }

      if (response.status === 404) {
        return json({
          error: `Gemini model or endpoint not found: ${message}`
        }, 404);
      }

      if (response.status === 429) {
        return json({
          error: `Gemini quota or rate limit reached: ${message}`
        }, 429);
      }

      return json({
        error: `Gemini API error (${response.status}): ${message}`
      }, 502);
    }

    // 8. Stream Gemini response to the browser.
    if (!response.body) {
      return json({
        error: 'Gemini returned an empty response.'
      }, 502);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (error) {
    console.error('Crown Code server error:', error);

    return json({
      error: 'Internal server error. Please try again.'
    }, 500);
  }
}
