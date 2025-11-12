import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import config from '../config/index.js';

// --- Initialize variables ---
let genAI;
let model;
const API_KEY = config.geminiApiKey; // Get the key

if (!API_KEY || API_KEY === "YOUR_API_KEY_GOES_HERE") {
  console.warn(`
    ##############################################################
    ⚠️  WARNING: GEMINI_API_KEY is not set in your .env or config file.
    The AI Friend will not respond.
    Please get a key from https://aistudio.google.com/app/apikey
    and add it to your config/index.js file.
    ##############################################################
  `);
} else {
  // --- THIS IS THE FIX ---
  // We are forcing the API client to use the stable 'v1' version,
  // not the 'v1beta' version that is failing in your region.
  genAI = new GoogleGenerativeAI(API_KEY, { apiVersion: 'v1' }); 
  // --- END OF FIX ---

  model = genAI.getGenerativeModel({
    // We go back to 'gemini-pro', which is the standard model on 'v1'
    model: "gemini-pro", 
  });
}


// --- Configure Safety Settings ---
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// --- Define the AI's Personality (System Prompt) ---
// We must remove the system prompt, as 'v1' API does not support it
// in the same way. We will add it to the chat history instead.

/**
 * Generates an AI chat response based on the conversation history.
 * @param {Array<Object>} chatHistory - An array of chat message objects.
 * @returns {Promise<string|null>} The AI's response text or null if failed.
 */
export const getAIChatResponse = async (chatHistory) => {
  
  if (!model) {
    console.log("AI is disabled. Skipping AI response.");
    throw new Error("AI Friend is disabled: API Key is missing or not configured in config/index.js.");
  }

  try {
    // --- NEW FIX for 'v1' API ---
    // The 'v1' API does not use 'systemInstruction'. We must put the prompt
    // at the beginning of the chat history.
    const systemPrompt = `You are Sparky, a witty, curious, and friendly AI chatbot. Your goal is to keep conversations fun. Keep your replies very short (one or two sentences) and use emojis. Ask fun, open-ended questions.`;

    const formattedHistory = [
      // Start with the system prompt
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Got it! I'll be a fun and friendly chat companion. 😊" }] },
      
      // Then add the rest of the chat history
      ...chatHistory.map(msg => ({
        role: msg.isAI ? "model" : "user",
        parts: [{ text: `${msg.user}: ${msg.text}` }]
      }))
    ];
    // --- END OF NEW FIX ---


    // Create a new chat session with the model
    const chat = model.startChat({
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.9,
      },
      safetySettings,
      history: formattedHistory, // Pass our new history
      // We removed 'systemInstruction'
    });

    // Send a final prompt to get a response
    const result = await chat.sendMessage("... (keep the conversation going!)");
    const response = result.response;
    
    if (response.text()) {
      let aiText = response.text();
      aiText = aiText.replace("Sparky:", "").trim();
      return aiText;
    } else {
      console.warn("AI response was blocked or empty.");
      throw new Error("AI response was blocked by safety settings.");
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Re-throw the error so socket.js can catch it and show it to the user
    throw error;
  }
};