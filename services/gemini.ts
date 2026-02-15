
import { GoogleGenAI, Type } from "@google/genai";

export interface StudentCandidate {
  id: string;
  photo: string;
  name: string;
}

export async function identifyStudent(capturedBase64: string, candidates: StudentCandidate[]): Promise<{ match: boolean; studentId: string | null; confidence: number }> {
  try {
    // process.env.API_KEY mavjudligini tekshirish
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Gemini API_KEY is missing in environment variables.");
      return { match: false, studentId: null, confidence: 0 };
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanCap = capturedBase64.replace(/^data:image\/\w+;base64,/, '');
    const validCandidates = candidates.filter(c => !!c.photo);
    
    if (validCandidates.length === 0) {
      return { match: false, studentId: null, confidence: 0 };
    }

    const imageParts: any[] = [
      { inlineData: { mimeType: 'image/jpeg', data: cleanCap } },
      { text: `IDENTITY VERIFICATION TASK:
The first image is the 'Subject' to be identified.
The following images are 'References' with IDs.
Compare the Subject's facial structure (eyes, nose, jaw) with the References.
Ignore lighting, background, or camera quality.
Return the ID of the matching student in JSON format.

{
  "match": boolean,
  "studentId": string | null,
  "confidence": number (0-1)
}` }
    ];

    validCandidates.forEach(c => {
      const cleanRef = c.photo.replace(/^data:image\/\w+;base64,/, '');
      imageParts.push({ text: `ID: ${c.id}` });
      imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanRef } });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: imageParts },
      config: {
        responseMimeType: "application/json"
      }
    });

    let textResult = response.text || '';
    // Clean up potential markdown blocks from the AI response
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(textResult);
    
    // Low confidence threshold adjustment for mobile cameras
    if (result.match && result.confidence < 0.25) {
      return { match: false, studentId: null, confidence: result.confidence };
    }

    return result;
  } catch (error) {
    console.error("AI Identification Exception:", error);
    return { match: false, studentId: null, confidence: 0 };
  }
}
