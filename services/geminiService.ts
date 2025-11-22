import { GoogleGenAI, Type } from "@google/genai";
import { GroundingChunk } from '../types';

let ai: GoogleGenAI | null = null;

export const initializeGenAI = () => {
  // Always create a new instance to pick up the latest key if changed
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
};

export const generateChatResponse = async (
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  prompt: string,
  useSearch: boolean = false,
  useMaps: boolean = false,
  location?: { latitude: number, longitude: number }
): Promise<{ text: string, groundingChunks?: GroundingChunk[] }> => {
  if (!ai) initializeGenAI();
  if (!ai) throw new Error("AI not initialized");

  const tools: any[] = [];
  if (useSearch) tools.push({ googleSearch: {} });
  if (useMaps) tools.push({ googleMaps: {} });

  const toolConfig = useMaps && location ? {
    retrievalConfig: {
      latLng: location
    }
  } : undefined;

  const model = "gemini-2.5-flash";

  try {
    const chat = ai.chats.create({
        model: model,
        history: history,
        config: {
            tools: tools.length > 0 ? tools : undefined,
            toolConfig: toolConfig
        }
    });

    const result = await chat.sendMessage({ message: prompt });
    
    // Extract grounding if available
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
    
    return {
      text: result.text || "I couldn't generate a text response, but check the sources.",
      groundingChunks
    };
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return { text: "Sorry, I encountered an error processing your request." };
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  if (!ai) initializeGenAI();
  if (!ai) throw new Error("AI not initialized");

  try {
    // Using gemini-2.5-flash-image (Nano Banana) for general image generation
    // This removes the need for the 'Pro' key selection flow.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      },
    });

    // Iterate to find image part
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
    if (!ai) initializeGenAI();
    if (!ai) throw new Error("AI not initialized");
  
    // Remove data prefix if present for the API call
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
       throw new Error("No edited image generated");
    } catch (error) {
      console.error("Image Edit Error:", error);
      throw error;
    }
};

// Helper for location
export const getCurrentLocation = (): Promise<{latitude: number, longitude: number} | undefined> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(undefined);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (err) => {
                console.warn("Geolocation error", err);
                resolve(undefined);
            }
        );
    });
};