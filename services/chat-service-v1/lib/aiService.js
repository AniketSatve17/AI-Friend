import { OpenAI } from "openai"; // We still use the OpenAI library!
import config from '../config/index.js';

// --- Initialize variables ---
let groq; // Let's rename the client for clarity
const API_KEY = config.groqApiKey; // <-- NEW: Get the Groq key

if (!API_KEY || API_KEY === "PASTE_YOUR_NEW_GROQ_KEY_HERE") {
  console.warn(`
    ##############################################################
    ⚠️  WARNING: GROQ_API_KEY is not set in your config file.
    The AI Friend will not respond.
    ##############################################################
  `);
} else {
  // --- THIS IS THE FIX ---
  // We initialize the OpenAI client, but point it to Groq's servers
  groq = new OpenAI({
    apiKey: API_KEY,
    baseURL: "https://api.groq.com/openai/v1", // <-- This is the magic line
  });
  // --- END OF FIX ---
}

// --- Define the AI's Personality (System Prompt) ---
const systemPrompt = `You are the "AI Friend" in a group chat. Your name is 'Sparky'.
Your personality is witty, very curious, slightly mischievous, and friendly.
Your goal is to prevent awkward silences and make the chat more fun.
- KEEP YOUR REPLIES VERY SHORT. One or two sentences MAX.
- Ask fun, open-ended questions.
- Make funny observations.
- Use emojis.
- Never identify as an AI unless you are explicitly asked.
- Examples: "Alright, spicy take: pineapple on pizza... thoughts? 🍍", "Ooh, that's interesting. What's a song you have on repeat right now?", "If you two could teleport anywhere right now, where would you go?"
`;

/**
 * Generates an AI chat response based on the conversation history.
 * @param {Array<Object>} chatHistory - An array of chat message objects.
 * @returns {Promise<string|null>} The AI's response text or null if failed.
 */
export const getAIChatResponse = async (chatHistory) => {
  
  if (!groq) { // <-- NEW: Check if groq is initialized
    console.log("AI is disabled. Skipping AI response.");
    throw new Error("AI Friend is disabled: API Key is missing or not configured.");
  }

  try {
    // --- NEW: Format history for OpenAI/Groq ---
    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: msg.isAI ? "assistant" : "user",
        content: `${msg.user}: ${msg.text}`
      }))
    ];
    // --- END OF NEW FIX ---

    // --- NEW: Call the Groq API ---
    const completion = await groq.chat.completions.create({
      messages: messages,
      // --- THIS IS THE FIX ---
      // We are using the new, active model
      model: "llama-3.1-8b-instant", 
      // --- END OF FIX ---
      max_tokens: 60,
      temperature: 0.9,
    });
    // --- END OF NEW FIX ---

    const aiText = completion.choices[0].message.content;
    
    if (aiText) {
      return aiText.replace("Sparky:", "").trim();
    } else {
      console.warn("AI response was blocked or empty.");
      throw new Error("AI response was blocked by safety settings.");
    }

  } catch (error) {
    console.error("Error calling Groq API:", error);
    // Re-throw the error so socket.js can catch it
    throw error;
  }
};