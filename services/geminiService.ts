import { GoogleGenAI, Type } from "@google/genai";
import { AIStructureResponse } from "../types";

export const generateVoxelStructure = async (prompt: string): Promise<AIStructureResponse> => {
  try {
    // Lazy initialization to prevent crash on app load if key is missing
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please configure Vercel Environment Variables.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a 2D pixel art scene for a falling sand physics game based on: "${prompt}". 
      The scene should be on a 120x120 grid.
      Use these color conventions to represent materials:
      - Blue (#3b82f6) for Water
      - Yellow/Orange (#fbbf24) for Sand
      - Gray (#52525b) for Stone/Walls
      - Brown (#78350f) for Wood
      - Red (#ef4444) for Fire/Lava
      
      Return a list of blocks with 2D coordinates.
      Structure should be centered. 
      For containers (like a glass or bucket), make sure to draw the walls (Stone/Glass) to hold the liquid.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "A short name for the scene" },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER },
                  z: { type: Type.INTEGER, description: "Always 0" },
                  color: { type: Type.STRING, description: "Hex color" }
                },
                required: ["x", "y", "color"]
              }
            }
          },
          required: ["name", "blocks"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText) as AIStructureResponse;
    }
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};