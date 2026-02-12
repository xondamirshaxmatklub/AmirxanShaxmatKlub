
import { GoogleGenAI, Type } from "@google/genai";

export async function verifyFace(referenceBase64: string, capturedBase64: string): Promise<{ match: boolean; confidence: number }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Clean up base64 if it includes prefix
    const cleanRef = referenceBase64.replace(/^data:image\/\w+;base64,/, '');
    const cleanCap = capturedBase64.replace(/^data:image\/\w+;base64,/, '');

    // Using Gemini API with responseSchema for structured JSON output as recommended
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanRef } },
          { inlineData: { mimeType: 'image/jpeg', data: cleanCap } },
          { text: "Compare these two photos. Are they the same person? Be very strict. If it is not clearly the same face, say no." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            match: {
              type: Type.BOOLEAN,
              description: "True if the persons in the two images are the same.",
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score of the match, from 0 to 1.",
            },
          },
          required: ["match", "confidence"],
        }
      }
    });

    // Access the text property directly, do not call text()
    const result = JSON.parse(response.text || '{"match": false, "confidence": 0}');
    return result;
  } catch (error) {
    console.error("Face verification error:", error);
    return { match: false, confidence: 0 };
  }
}
