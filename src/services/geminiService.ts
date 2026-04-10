import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FacialAnalysis {
  overallScore: number;
  symmetry: {
    score: number;
    details: string;
    horizontalBalance: string;
    verticalBalance: string;
  };
  features: {
    eyes: { 
      rating: number; 
      description: string;
      canthalTilt: string;
      interpupillaryDistance: string;
    };
    nose: { rating: number; description: string };
    jawline: { 
      rating: number; 
      description: string;
      gonialAngle: number;
      definition: string;
    };
    lips: { rating: number; description: string };
  };
  cephalometrics: {
    facialIndex: number;
    nasalIndex: number;
    midfaceRatio: number;
    mandibularAngle: number;
  };
  skinHealth: {
    texture: string;
    clarity: number;
    zonalAnalysis: {
      forehead: number;
      cheeks: number;
      chin: number;
    };
    concerns: string[];
  };
  recommendations: string[];
}

export async function analyzeFaceWithAI(base64Image: string, landmarks?: any[]): Promise<FacialAnalysis> {
  // Remove data:image/jpeg;base64, prefix if present
  const base64Data = base64Image.split(',')[1] || base64Image;

  // Prepare landmarks context if available
  const landmarksContext = landmarks && landmarks.length > 0 
    ? `\nFACIAL LANDMARK DATA (468 points, 3D coordinates):\n${JSON.stringify(landmarks.map(l => ({ x: l.x.toFixed(4), y: l.y.toFixed(4), z: l.z.toFixed(4) })))}`
    : '';

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: `Perform a rigorous, high-precision cephalometric and aesthetic facial analysis. 
            ${landmarksContext}
            
            CRITICAL INSTRUCTIONS:
            1. UNIQUE RATINGS: Do NOT provide generic or "safe" scores. Every face is unique. Use the full 1-100 scale with high variance. A score of 85 should be significantly different from an 82.
            2. MATHEMATICAL RIGOR: Base all ratings on strict mathematical proportions and the provided 3D landmark coordinates for sub-millimeter precision:
               - The Golden Ratio (phi)
               - The Rule of Thirds (vertical facial divisions)
               - The Rule of Fifths (horizontal eye/nose spacing)
               - Specific angles (Gonial angle, Canthal tilt, Nasolabial angle)
            3. OBJECTIVE CRITIQUE: Be clinical and highly critical. Identify even minor asymmetries or deviations from ideal aesthetic markers.
            4. TERMINOLOGY: Use advanced Qoves-style terminology (e.g., "infraorbital rim support", "maxillary recession", "bizygomatic width").
            5. DIFFERENTIATION: Ensure that subtle differences in jawline definition, eye spacing, or skin texture result in distinct numerical ratings.
            
            Provide detailed ratings and measurements in a structured JSON format.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          symmetry: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              details: { type: Type.STRING },
              horizontalBalance: { type: Type.STRING },
              verticalBalance: { type: Type.STRING },
            },
            required: ["score", "details", "horizontalBalance", "verticalBalance"],
          },
          features: {
            type: Type.OBJECT,
            properties: {
              eyes: { 
                type: Type.OBJECT, 
                properties: { 
                  rating: { type: Type.NUMBER }, 
                  description: { type: Type.STRING },
                  canthalTilt: { type: Type.STRING },
                  interpupillaryDistance: { type: Type.STRING }
                },
                required: ["rating", "description", "canthalTilt", "interpupillaryDistance"]
              },
              nose: { 
                type: Type.OBJECT, 
                properties: { rating: { type: Type.NUMBER }, description: { type: Type.STRING } },
                required: ["rating", "description"]
              },
              jawline: { 
                type: Type.OBJECT, 
                properties: { 
                  rating: { type: Type.NUMBER }, 
                  description: { type: Type.STRING },
                  gonialAngle: { type: Type.NUMBER },
                  definition: { type: Type.STRING }
                },
                required: ["rating", "description", "gonialAngle", "definition"]
              },
              lips: { 
                type: Type.OBJECT, 
                properties: { rating: { type: Type.NUMBER }, description: { type: Type.STRING } },
                required: ["rating", "description"]
              },
            },
            required: ["eyes", "nose", "jawline", "lips"],
          },
          cephalometrics: {
            type: Type.OBJECT,
            properties: {
              facialIndex: { type: Type.NUMBER },
              nasalIndex: { type: Type.NUMBER },
              midfaceRatio: { type: Type.NUMBER },
              mandibularAngle: { type: Type.NUMBER },
            },
            required: ["facialIndex", "nasalIndex", "midfaceRatio", "mandibularAngle"],
          },
          skinHealth: {
            type: Type.OBJECT,
            properties: {
              texture: { type: Type.STRING },
              clarity: { type: Type.NUMBER },
              zonalAnalysis: {
                type: Type.OBJECT,
                properties: {
                  forehead: { type: Type.NUMBER },
                  cheeks: { type: Type.NUMBER },
                  chin: { type: Type.NUMBER }
                },
                required: ["forehead", "cheeks", "chin"]
              },
              concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["texture", "clarity", "zonalAnalysis", "concerns"],
          },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["overallScore", "symmetry", "features", "cephalometrics", "skinHealth", "recommendations"],
      },
    },
  });

  return JSON.parse(response.text);
}
