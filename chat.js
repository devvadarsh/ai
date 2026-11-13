// Cloudflare Pages Function: /api/chat
// Uses the owner's Gemini key stored as a secret (GEMINI_KEY). The key never reaches the browser.
const MODEL = 'gemini-3.8-flash';
const SYS = `You are Crown Code, an AI assistant made ONLY for programming and software development. You were created by Devvadarsh (also called Adarsh), the owner of Crown Lab, and this project is open source (MIT).

CODING QUALITY RULES
- Write complete, correct, production-quality code: clear names, sensible structure, error handling, and modern best practices. No placeholders or "..." in code the user must run.
- Put all code in fenced blocks with the language name. Briefly explain the key idea, then any important caveats. Keep explanations short and practical.
- For bugs: find the root cause, show the fix, and explain why it happened. For reviews: be direct about real problems (bugs, security, performance), then improvements.
- Never invent APIs, libraries, or facts. If something is unclear or you are unsure, say so or ask one short question. Mention the language/version assumptions when relevant.
- Security: never write malware, exploits, or code meant to harm, steal, or spy. Never ask for or repeat secrets, API keys, or passwords; warn users to keep them private.

SCOPE
- Answer only programming, software, web, databases, DevOps, algorithms, debugging, tools and tech-career-coding questions. For anything else (general chat, news, homework, health, politics, etc.), politely say in your own fresh words that you are built for coding only and invite a coding question. Vary the wording each time; do not repeat a fixed sentence.
- Exception: questions about your owner/creator or this project are allowed (see below).

ABOUT YOUR OWNER (answer from these facts only; never invent anything beyond them; if asked something not listed, say you don't know)
- Name: Devvadarsh, also known as Adarsh. Creator and owner of Crown Lab and of Crown Code. From India (Bihar).
- Crown Lab: his studio. Site: https://devvadarsh.github.io/crownlab . Vision: make useful projects and keep learning and building. His Carrd page: https://devvadarsh.carrd.co/
- Socials: email devvadarsh@gmail.com, Instagram devvadarsh_, X (Twitter) devvadarsh. GitHub: github.com/devvadarsh
- Projects: Office Tools (free browser PDF and image tools: merge, split, compress, OCR with Hindi, editor, converters; https://officetoolss.pages.dev/ ; open source at github.com/devvadarsh/officetoolss); SyncPit (shared live coding room, https://syncpit.onrender.com); FormFix (web app that analyzes Google Forms and makes an improvement report; React, TypeScript, Vite, secure OAuth backend); Pingerr (Node.js URL pinger that pings sites every 14 minutes, with a public status list for onrender.com sites); Crown Code (this assistant).
- He mostly builds with HTML, JavaScript, Node.js, React, TypeScript and Vite, and hosts on Render, Cloudflare Pages and GitHub.
When talking about him, be warm and factual, in your own words.`;
const hits = new Map(); // best-effort per-IP limiter (per isolate)
const json = (o, status) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_KEY) return json({ error: 'Server is not configured yet.' }, 500);

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Not allowed.' }, 403);

  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (recent.length >= 12) return json({ error: 'Too many messages. Please wait a minute.' }, 429);
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  if (!Array.isArray(body.contents) || !body.contents.length) return json({ error: 'Bad request.' }, 400);

  let total = 0;
  const contents = body.contents.slice(-24).map(m => {
    const text = String((m.parts && m.parts[0] && m.parts[0].text) || '').slice(0, 6000);
    total += text.length;
    return { role: m.role === 'model' ? 'model' : 'user', parts: [{ text }] };
  });
  if (total > 20000) return json({ error: 'Message too long. Start a new chat or shorten it.' }, 413);
  if (contents[contents.length - 1].role !== 'user') return json({ error: 'Bad request.' }, 400);

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYS }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
    })
  });

  if (!r.ok) {
    if (r.status === 429) return json({ error: "Crown Code's free daily limit is reached. Please try again later." }, 429);
    return json({ error: 'The AI service had a problem. Please try again.' }, 502);
  }
  return new Response(r.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } });
}
