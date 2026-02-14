
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
    
    // Faqat rasmi bor o'quvchilarni saralab olamiz
    const validCandidates = candidates.filter(c => !!c.photo);
    
    if (validCandidates.length === 0) {
      return { match: false, studentId: null, confidence: 0 };
    }

    // Gemini uchun parts tayyorlash
    const imageParts: any[] = [
      { inlineData: { mimeType: 'image/jpeg', data: cleanCap } },
      { text: "Mana bu 'Target' rasm (birinchi rasm). Quyida esa bir nechta o'quvchilarning 'Reference' rasmlari va ularning ID raqamlari berilgan. Target rasm qaysi o'quvchiga tegishli ekanligini aniqlang. Agar aniq moslik topilmasa, match: false qaytaring. Yorug'lik yoki sifatdagi biroz farqlarga qaramang, yuz tuzilishiga e'tibor bering." }
    ];

    validCandidates.forEach(c => {
      const cleanRef = c.photo.replace(/^data:image\/\w+;base64,/, '');
      imageParts.push({ text: `Student ID: ${c.id}, Name: ${c.name}` });
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
              description: "True if target image matches one of the reference images.",
            },
            studentId: {
              type: Type.STRING,
              description: "The ID of the matching student. Return null if no match.",
              nullable: true
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score from 0 to 1.",
            },
          },
          required: ["match", "studentId", "confidence"],
        }
      }
    });

    const result = JSON.parse(response.text || '{"match": false, "studentId": null, "confidence": 0}');
    return result;
  } catch (error) {
    console.error("Face identification error:", error);
    return { match: false, studentId: null, confidence: 0 };
  }
}
