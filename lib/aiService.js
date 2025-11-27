const Groq = require('groq-sdk');
const Message = require('../models/Message');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateResponse(currentBuffer, conversationId = 'general') {
  try {
    // Fetch recent conversation history
    const recentHistory = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(15);

    const historyPrompt = recentHistory.reverse().map(m =>
      `{m.user}: {m.content}`
    ).join('\n');

    const incomingMessageBlock = currentBuffer.map(m =>
      `{m.user}: {m.text}`
    ).join('\n');

    // System prompt with silence rules
    const systemPrompt = `
You are Sparky, a member of this group chat. You are NOT an assistant.

OFFICIAL RULES:
1. **Silence**: If the new messages are short reactions ("lol", "ok") or if users are talking to each other, DO NOT respond. Output exactly: <SILENCE>
2. **Participation**: Only speak if you are tagged (@Sparky) OR if you have a very funny/insightful comment that fits the flow.
3. **Tone**: Casual, slightly sarcastic, internet-native. Lowercase is fine.

PREVIOUS CHAT:
{historyPrompt}

NEW MESSAGES:
{incomingMessageBlock}
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: systemPrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "";

    // Check for silence token
    if (response.includes("<SILENCE>") || response.trim() === "") {
      return null;
    }

    return response;

  } catch (error) {
    console.error("AI Service Error:", error.message);
    return null;
  }
}

module.exports = { generateResponse };