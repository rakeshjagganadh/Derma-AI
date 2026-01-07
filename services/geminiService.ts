import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DetailedDiagnosis, RoutineResult, BudgetOption } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const diagnosisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    faceArchitecture: {
      type: Type.OBJECT,
      properties: {
        shape: { type: Type.STRING, description: "Your face shape (Oval, Square, etc)" },
        structuralAnalysis: { type: Type.STRING, description: "Detailed structural reasoning addressing 'You' (e.g., 'Your cheekbones are...')" },
        skinAge: { type: Type.INTEGER, description: "Estimated skin age based on markers" },
        agingMarkers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of aging signs like folds or sagging" }
      },
      required: ["shape", "structuralAnalysis", "skinAge", "agingMarkers"]
    },
    positiveAttributes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 3-5 positive traits detected (e.g. 'Strong Barrier', 'Even Tone', 'Good Elasticity')."
    },
    zones: {
      type: Type.ARRAY,
      description: "Analysis of specific facial zones",
      items: {
        type: Type.OBJECT,
        properties: {
          zoneName: { type: Type.STRING, enum: ['Forehead', 'Nose', 'Left Cheek', 'Right Cheek', 'Chin', 'Under-eyes', 'Jawline', 'Neck'] },
          oilLevel: { type: Type.STRING, enum: ['Dry', 'Balanced', 'Oily', 'Very Oily'] },
          textureScore: { type: Type.INTEGER, description: "1-10 scale where 10 is perfectly smooth" },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                commonName: { type: Type.STRING, description: "Common name e.g., Pimples" },
                medicalTerm: { type: Type.STRING, description: "Medical term e.g., Acne Vulgaris" },
                category: { type: Type.STRING, enum: ['Inflammation', 'Dryness', 'Pigmentation', 'Texture', 'Aging'] },
                severity: { type: Type.STRING, enum: ['Mild', 'Moderate', 'Severe'] },
                rootCause: { type: Type.STRING, description: "Why this is happening to YOU. Be specific about location (e.g., 'Friction on Left Jawline')." },
                cureStrategy: { type: Type.STRING, description: "How YOU can fix it. Direct advice." },
                locations: {
                  type: Type.ARRAY,
                  description: "Where this specific issue appears across the 3 images.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      view: { type: Type.STRING, enum: ['Front', 'Left', 'Right'] },
                      box: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[ymin, xmin, ymax, xmax] 0-1000" }
                    },
                    required: ["view", "box"]
                  }
                }
              },
              required: ["commonName", "medicalTerm", "category", "severity", "rootCause", "cureStrategy", "locations"]
            }
          }
        },
        required: ["zoneName", "oilLevel", "textureScore", "issues"]
      }
    },
    summary: { type: Type.STRING, description: "A final Clinical Note. Mention specific side-profile issues if they differ from the front." }
  },
  required: ["faceArchitecture", "positiveAttributes", "zones", "summary"]
};

export const analyzeSkin = async (
  frontFace: File,
  leftProfile: File,
  rightProfile: File
): Promise<DetailedDiagnosis> => {
  const frontPart = await fileToGenerativePart(frontFace);
  const leftPart = await fileToGenerativePart(leftProfile);
  const rightPart = await fileToGenerativePart(rightProfile);

  const prompt = `
    Act as a Senior Clinical Dermatologist. Conduct a rigorous medical analysis of these 3 images.
    
    INPUTS:
    Image 1: Front Face
    Image 2: Left Profile
    Image 3: Right Profile

    PROTOCOL (The 3-Image Cross-Reference):
    - You are analyzing three angles of the same person. 
    - Cross-reference findings. If a dark spot is visible on the 'Left Profile' but hidden in the 'Front Face', you MUST report it.
    - Do not ignore side-profile exclusive issues (e.g., hormonal acne on jawline, sun spots on cheeks).
    - In your text analysis (Root Cause), explicitly mention the location context (e.g., "The Grade 3 acne is concentrated on your Left Jawline, suggesting...").

    TONE: 
    - Clinical, Neutral, and Objective.
    - No fake enthusiasm.

    OUTPUT:
    - Output STRICT JSON matching the schema.
    - For 'locations', you MUST generate bounding boxes for the specific view where the issue is visible. 
    - An issue can have multiple location entries if visible in multiple views.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        frontPart,
        leftPart,
        rightPart,
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: diagnosisSchema,
      temperature: 0.1, // Very low for consistency
      thinkingConfig: { thinkingBudget: 2048 }
    }
  });

  if (!response.text) throw new Error("No analysis returned");
  return JSON.parse(response.text) as DetailedDiagnosis;
};

export const getRoutineRecommendation = async (
  diagnosis: DetailedDiagnosis,
  budget: BudgetOption
): Promise<RoutineResult> => {

  const allIssues = diagnosis.zones.flatMap(z => z.issues.map(i => i.commonName));
  const severeIssues = diagnosis.zones.flatMap(z => z.issues.filter(i => i.severity === 'Severe' || i.severity === 'Moderate'));
  const skinTypeDerived = diagnosis.zones.find(z => z.zoneName === 'Nose')?.oilLevel || 'Balanced';

  const prompt = `
    Based on this medical diagnosis:
    Skin Type: ${skinTypeDerived}
    Positive Attributes: ${diagnosis.positiveAttributes.join(', ')}
    Major Concerns: ${Array.from(new Set(allIssues)).join(', ')}
    Specific Severe Issues: ${severeIssues.map(i => i.commonName).join(', ')}
    Summary: ${diagnosis.summary}

    User's Budget: ${budget} (INR).

    Task: Recommend a "Budget Reality" Skincare Routine.
    Address the user as "You".

    1. Routine Goal: Medical name (e.g., "The Repair Protocol").
    
    2. Product Logic (The "Must-Have" vs "Gap Analysis"):
       - **Rule #1 (Non-Negotiable):** Sunscreen is MANDATORY. It must always be in the 'essentialKit'.
       - **Rule #2 (Essential Kit):** Recommend 3-5 items that strictly fit within the INR budget. Prioritize the worst problems (e.g., Acne > Aging).
       - **Rule #3 (Add-on / Compromise):** If the budget forces you to drop a necessary item (e.g., Eye Cream for dark circles or a second serum), put it in 'recommendedAddon'.
       - **Rule #4 (Compromise Note):** If you dropped an item, explain why in 'compromiseNote' (e.g., "Based on your ₹1000 limit, we prioritized curing your active acne. We skipped the Eye Cream for now.").

    3. Product Details:
       - Explain "Why this specific bottle?" linking to diagnosis.
       - Key Ingredients.
       - Usage Instructions.

    4. Brands: Minimalist, Cetaphil, Derma Co, Sebamed, CeraVe, Bioderma, La Roche-Posay, Dot & Key.

    Output JSON structure:
    {
      "routineGoal": "String",
      "essentialKit": [
        { "category": "...", "brand": "...", "name": "...", "reason": "...", "keyIngredients": ["..."], "usageInstructions": "...", "approxPrice": "..." }
      ],
      "recommendedAddon": { "category": "...", "brand": "...", "name": "...", "reason": "...", "keyIngredients": ["..."], "usageInstructions": "...", "approxPrice": "..." } (OR null),
      "compromiseNote": "String" (OR null),
      "amRoutine": ["..."],
      "pmRoutine": ["..."]
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      temperature: 0.2,
    }
  });

  if (!response.text) throw new Error("No routine returned");
  const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(text) as RoutineResult;
};

export const editImage = async (imageFile: File, instruction: string): Promise<string> => {
  const imagePart = await fileToGenerativePart(imageFile);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        imagePart.inlineData,
        { text: instruction }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generateImage = async (prompt: string, aspectRatio: string, size: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: size as any
      }
    }
  });

   for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};