
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

    // Advanced Biometric Prompt
    const imageParts: any[] = [
      { inlineData: { mimeType: 'image/jpeg', data: cleanCap } },
      { text: `TASK: Face Identification.
Input: One 'Target' image (the person in front of the camera) and multiple 'Reference' images of students.
Objective: Identify which Reference student is the Target.

GUIDELINES:
1. Focus on permanent facial features: eye shape, distance between eyes, nose bridge, jawline, and forehead structure.
2. Ignore differences in: lighting, background, camera angle, minor facial expressions, and image quality.
3. Even if the quality is low, try to find the closest skeletal/facial match.
4. Output MUST be in JSON format only.

Output Schema:
{
  "match": boolean,
  "studentId": "string or null",
  "confidence": number (0.0 to 1.0)
}` }
    ];

    validCandidates.forEach(c => {
      const cleanRef = c.photo.replace(/^data:image\/\w+;base64,/, '');
      imageParts.push({ text: `REFERENCE_ID: ${c.id}` });
      imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanRef } });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: imageParts },
      config: {
        responseMimeType: "application/json"
      }
    });

    let textResult = response.text || '{"match": false, "studentId": null, "confidence": 0}';
    
    // Sanitizing Markdown JSON blocks if present
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(textResult);
    
    // Adjusted confidence threshold for low-quality mobile cameras
    if (result.match && result.confidence < 0.3) {
        return { match: false, studentId: null, confidence: result.confidence };
    }

    return result;
  } catch (error) {
    console.error("Face identification error:", error);
    return { match: false, studentId: null, confidence: 0 };
  }
}
