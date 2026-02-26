
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DetailedDiagnosis, RoutineResult, BudgetOption, AspectRatio, ImageSize, GenderContent, Gender } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      if (!base64Data) {
        reject(new Error("Failed to read file data"));
        return;
      }
      const base64Content = base64Data.split(',')[1];
      if (!base64Content) {
        reject(new Error("Failed to extract base64 string"));
        return;
      }
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type || 'image/jpeg',
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- VALIDATION LOGIC ---

const validationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN, description: "True ONLY if a clear real human face is detected. False for objects, animals, blurry blobs, or photos of screens." },
    detectedAngle: { type: Type.STRING, enum: ['front', 'side', 'other'], description: "The angle of the face." },
    message: { type: Type.STRING, description: "Short error message if invalid, or confirmation if valid." }
  },
  required: ["isValid", "detectedAngle", "message"]
};

export interface ValidationResult {
  isValid: boolean;
  detectedAngle: 'front' | 'side' | 'other';
  message: string;
}

export const validateImage = async (file: File, expectedView: 'front' | 'side'): Promise<ValidationResult> => {
  const imagePart = await fileToGenerativePart(file);
  
  const prompt = `
    You are an AI Gatekeeper for a Dermatology App. Validate this image.
    
    CRITERIA:
    1. Is it a CLEAR, REAL Human Face? (Reject drawings, dark photos, blurry photos, body parts, objects).
    2. Check the Angle. Expected: ${expectedView === 'front' ? 'Frontal View' : 'Side Profile'}.
    3. Anti-Spoofing: Reject if it looks like a photo of a computer screen or a low-quality printout.

    Output JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [imagePart, { text: prompt }]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: validationSchema,
        temperature: 0.1,
      }
    });

    if (!response.text) return { isValid: false, detectedAngle: 'other', message: 'AI Validation Failed' };
    return JSON.parse(response.text) as ValidationResult;
  } catch (error) {
    console.error("Validation Error", error);
    return { isValid: true, detectedAngle: expectedView, message: 'Validation bypassed due to network' };
  }
};

// --- DIAGNOSIS LOGIC ---

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
    lifestyle_triggers: {
      type: Type.ARRAY,
      description: "Map specific visible issues to lifestyle habits using 'Face Mapping' logic.",
      items: {
        type: Type.OBJECT,
        properties: {
          issue: { type: Type.STRING, description: "The specific observed issue (e.g., 'Right Cheek Acne')." },
          trigger: { type: Type.STRING, description: "The lifestyle cause (e.g., 'Dirty Pillowcase or Phone Screen')." },
          habit: { type: Type.STRING, description: "Simple habit change (e.g., 'Wipe phone daily, change pillowcase')." }
        },
        required: ["issue", "trigger", "habit"]
      }
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
                commonName: { type: Type.STRING, description: "Use specific names: 'Micro-Comedones', 'Sebum Plugs', 'Fungal Acne', 'Sun Spots'." },
                medicalTerm: { type: Type.STRING, description: "Medical term e.g., Acne Vulgaris" },
                category: { type: Type.STRING, enum: ['Inflammation', 'Dryness', 'Pigmentation', 'Texture', 'Aging'] },
                severity: { type: Type.STRING, enum: ['Mild', 'Moderate', 'Severe'] },
                rootCause: { type: Type.STRING, description: "Why this is happening to YOU. Be specific about location (e.g., 'Friction on Left Jawline'). USE PLAIN ENGLISH." },
                cureStrategy: { type: Type.STRING, description: "How YOU can fix it. Direct advice." },
                locations: {
                  type: Type.ARRAY,
                  description: "Where this specific issue appears across the 3 images.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      view: { type: Type.STRING, enum: ['Front', 'Left', 'Right'] },
                      box: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[ymin, xmin, ymax, xmax] 0-1000. For Pores/Texture, break large areas into multiple smaller cluster boxes." }
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
  required: ["faceArchitecture", "positiveAttributes", "lifestyle_triggers", "zones", "summary"]
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
    Act as a Senior Clinical Dermatologist. Conduct a rigorous, EXHAUSTIVE medical analysis of these 3 images.
    
    MODE: "Micro-Feature Scanner"
    Do not just detect major acne. You must scan for and list coordinates for micro-features across all 3 angles (Front, Left, Right).

    DETECTION TARGETS (Be extremely specific):
    - micro_comedones: Tiny skin-colored bumps/whiteheads (often on forehead/chin).
    - enlarged_pores: Visible pore structures in T-zone. Break these into multiple small "cluster" boxes rather than one big box.
    - pigment_points: Small freckles, post-acne marks (PIH), or sun spots.
    - sebum_plugs: Blackheads on nose/chin.
    - texture_roughness: Dry/flaky patches (often around mouth or cheeks).
    - inflammation: Active red papules or pustules.

    PROTOCOL (The 3-Image Cross-Reference):
    - You are analyzing three angles of the same person. 
    - Cross-reference findings. If a dark spot is visible on the 'Left Profile' but hidden in the 'Front Face', you MUST report it.
    - Do not ignore side-profile exclusive issues (e.g., hormonal acne on jawline, sun spots on cheeks).
    - In your text analysis (Root Cause), explicitly mention the location context.

    OUTPUT:
    - Output STRICT JSON matching the schema.
    - For 'locations', do not just draw one huge box for the forehead. Draw specific boxes around CLUSTERS of issues. 
    - High Fidelity: We want to feel like every square millimeter was scanned.
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
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 4096 }
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

    Task: Recommend a "Budget Reality" Skincare Routine and perform a Safety Check.
    Act as an ESTHETICIAN teaching a client how to physically apply products.

    1. Routine Goal: Medical name (e.g., "The Repair Protocol").
    
    2. Product Logic:
       - **Rule #1:** Sunscreen is MANDATORY.
       - **Rule #2:** Recommend 3-5 items that fit within the budget.
       - **Rule #3:** If budget restricts a needed item (e.g. eye cream), put it in 'recommendedAddon'.

    3. SAFETY PROTOCOL:
       - Cross-reference ingredients (Salicylic Acid, Retinol, etc).
       - Generate warnings for sun sensitivity or mixing conflicts.
    
    4. RITUAL GUIDE (Crucial):
       - Do not just list the name. 
       - Provide 'action' (Massage, Pat, Dab).
       - Provide 'duration' (60s, until absorbed).
       - Provide 'technique' (Circular motions, Upward strokes).
       - Provide 'proTip' (A one sentence hack).
       - **NIGHT ROUTINE RULE:** For the final step of the PM routine (Moisturizer), set the instruction to: "Apply a thick layer 30 mins before pillow contact to lock in moisture overnight."

    Brands: Minimalist, Cetaphil, Derma Co, Sebamed, CeraVe, Bioderma, La Roche-Posay, Dot & Key.

    Output JSON structure:
    {
      "routineGoal": "String",
      "essentialKit": [
        { "category": "...", "brand": "...", "name": "...", "reason": "...", "keyIngredients": ["..."], "usageInstructions": "...", "approxPrice": "..." }
      ],
      "recommendedAddon": { "category": "...", "brand": "...", "name": "...", "reason": "...", "keyIngredients": ["..."], "usageInstructions": "...", "approxPrice": "..." },
      "compromiseNote": "String",
      "safety_warnings": [
         { "type": "Sun Alert" | "Conflict" | "General", "warning": "..." }
      ],
      "amRoutine": [
        { "stepName": "Cleanse", "productName": "...", "action": "Massage", "duration": "60s", "surface": "Damp Skin", "technique": "...", "proTip": "...", "frequency": "Daily" }
      ],
      "pmRoutine": [
        { "stepName": "Cleanse", "productName": "...", "action": "Massage", "duration": "60s", "surface": "Damp Skin", "technique": "...", "proTip": "...", "frequency": "Daily" }
      ]
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

// --- GLOWUP HUB: CREATIVE ENGINE ---

const genderContentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tip: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING, description: "A 1-sentence punchy tip." }
      },
      required: ["title", "content"]
    },
    blog: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING, description: "Viral style headline" },
          summary: { type: Type.STRING },
          full_markdown_content: { type: Type.STRING, description: "300 words. Use H2, bullet points, and bold text." },
          image_generation_prompt: { type: Type.STRING, description: "A cinematic, photorealistic AI image prompt to represent this article." },
          category: { type: Type.STRING },
          readTime: { type: Type.STRING }
        },
        required: ["id", "title", "summary", "full_markdown_content", "image_generation_prompt", "category", "readTime"]
    }
  },
  required: ["tip", "blog"]
};

export const generateGlowUpContent = async (gender: Gender): Promise<GenderContent> => {
  const prompt = `
    Generate the "Daily GlowUp" content for: ${gender}.
    
    1. Tip of the Day: One short, seasonal skincare or grooming tip.
    2. Blog Post: Generate 1 Viral-Style mini blog post about Skincare, Hair, or Fashion/Grooming for ${gender}.
    
    For the blog, write the Full Content (approx 300 words) in Markdown.
    Crucially, write a detailed 'image_generation_prompt' that describes a high-end, photorealistic 8k image to go with it.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: genderContentSchema,
      temperature: 0.7
    }
  });

  if (!response.text) throw new Error("Failed to generate content");
  return JSON.parse(response.text) as GenderContent;
};

// --- TOOLS: IMAGE EDITING ---

export const editImage = async (file: File, prompt: string): Promise<string | null> => {
  const imagePart = await fileToGenerativePart(file);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        imagePart,
        { text: prompt }
      ]
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
};

// --- TOOLS: IMAGE GENERATION ---

export const generateImage = async (prompt: string, aspectRatio: AspectRatio, imageSize: ImageSize): Promise<string | null> => {
  // Use Pro for high res, Flash for standard
  const isHighRes = (imageSize === '2K' || imageSize === '4K');
  const model = isHighRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  // Flash image model does not support imageSize parameter (it defaults to 1K)
  // We only add imageSize if we are using the Pro model.
  const imageConfig: any = {
    aspectRatio: aspectRatio,
  };

  if (isHighRes) {
    imageConfig.imageSize = imageSize;
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: imageConfig
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
};
