
import { GoogleGenAI, Type } from "@google/genai";

export interface StudentCandidate {
  id: string;
  photo: string;
  name: string;
}

/**
 * AI yordamida o'quvchini aniqlash.
 * process.env.API_KEY dan foydalanadi.
 */
export async function identifyStudent(capturedBase64: string, candidates: StudentCandidate[]): Promise<{ match: boolean; studentId: string | null; confidence: number }> {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Gemini API_KEY topilmadi. Vercel muhitini tekshiring.");
      return { match: false, studentId: null, confidence: 0 };
    }

    const ai = new GoogleGenAI({ apiKey });
    // Base64 dan keraksiz qismni olib tashlash
    const cleanCap = capturedBase64.split(',')[1] || capturedBase64;
    
    // Faqat rasmi bor o'quvchilarni olish
    const validCandidates = candidates.filter(c => c.photo && c.photo.includes(','));
    
    if (validCandidates.length === 0) {
      return { match: false, studentId: null, confidence: 0 };
    }

    const parts: any[] = [
      {
        text: `Vazifa: Birinchi rasmda tasvirlangan shaxsni quyidagi ro'yxatdagi o'quvchilar orasidan aniqlang.
        Javobni FAQAT JSON formatida qaytaring: {"match": boolean, "studentId": "id_string_yoki_null", "confidence": 0-1 oralig'ida}.
        Agar o'quvchi aniq tanilsa, "match" true bo'lsin.`
      },
      { inlineData: { mimeType: 'image/jpeg', data: cleanCap } }
    ];

    validCandidates.forEach(c => {
      const data = c.photo.split(',')[1] || c.photo;
      parts.push({ text: `ID: ${c.id}` });
      parts.push({ inlineData: { mimeType: 'image/jpeg', data } });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const textResult = response.text || '{"match": false}';
    // Markdown bloklarini (```json ... ```) tozalash
    const cleanJson = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Identifikatsiya xatosi:", error);
    return { match: false, studentId: null, confidence: 0 };
  }
}
