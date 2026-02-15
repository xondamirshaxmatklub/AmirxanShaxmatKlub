
import { GoogleGenAI, Type } from "@google/genai";

export interface StudentCandidate {
  id: string;
  photo: string;
  name: string;
}

export async function identifyStudent(capturedBase64: string, candidates: StudentCandidate[]): Promise<{ match: boolean; studentId: string | null; confidence: number }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const cleanCap = capturedBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Only students with reference photos
    const validCandidates = candidates.filter(c => !!c.photo);
    
    if (validCandidates.length === 0) {
      return { match: false, studentId: null, confidence: 0 };
    }

    // Prepare parts for Gemini
    // We use English for system-like instructions as Gemini models are more robust with it.
    const imageParts: any[] = [
      { inlineData: { mimeType: 'image/jpeg', data: cleanCap } },
      { text: "INSTRUCTION: The first image is the 'Target'. Below are 'Reference' images with their IDs. Compare the Target face with all Reference faces. Focus on bone structure, eye shape, and nose. Ignore lighting, background, or minor facial expression differences. If a strong match is found, return the ID. If not sure, return match: false." }
    ];

    validCandidates.forEach(c => {
      const cleanRef = c.photo.replace(/^data:image\/\w+;base64,/, '');
      imageParts.push({ text: `Reference ID: ${c.id}` });
      imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanRef } });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: imageParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            match: {
              type: Type.BOOLEAN,
              description: "True if the person in the target image is clearly one of the reference students.",
            },
            studentId: {
              type: Type.STRING,
              description: "The ID of the matching student from the provided references.",
              nullable: true
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score from 0.0 to 1.0",
            },
          },
          required: ["match", "studentId", "confidence"],
        }
      }
    });

    const textResult = response.text || '{"match": false, "studentId": null, "confidence": 0}';
    const result = JSON.parse(textResult);
    
    // Low confidence threshold
    if (result.confidence < 0.4) {
        return { match: false, studentId: null, confidence: result.confidence };
    }

    return result;
  } catch (error) {
    console.error("Face identification error:", error);
    return { match: false, studentId: null, confidence: 0 };
  }
}
