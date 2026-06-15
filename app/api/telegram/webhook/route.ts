import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const text = body.message?.text;
  const chatId = body.message?.chat?.id;

  if (!text || !chatId) {
    return NextResponse.json({ ok: false });
  }

  // 1. call YOUR REAL AGENT (important)
  const res = await fetch("https://lexi-agent-nine.vercel.app/api/agent/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word: text }),
  });

  const data = await res.json();

  // 2. format real AI response ONLY
  const reply = `
📘 ${data.word || text}

💡 Meaning: ${data.meaning || "N/A"}
🇨🇳 Chinese: ${data.chinese_translation || "N/A"}
✏️ Example: ${data.example || "N/A"}
🔗 Source: ${data.source_url || "N/A"}
  `;

  // 3. send back to Telegram
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: reply,
    }),
  });

  return NextResponse.json({ ok: true });
}