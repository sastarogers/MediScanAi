import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, MedicationResponse, TriageLevel, HealthRecord, HealthInsight, FirstAidGuide, LANGUAGES } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const COMPLEX_MODEL = 'gemini-3-pro-preview';
const FAST_MODEL = 'gemini-2.5-flash';

/**
 * Helper to get full language name from code
 */
const getLanguageName = (code: string): string => {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : 'English';
};

/**
 * Compress image for low-bandwidth scenarios
 */
export const compressImage = (file: File, quality = 0.6, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          // Remove prefix
          resolve(compressedBase64.split(',')[1]);
        } catch (e) {
          // Fallback if canvas fails
          resolve((event.target?.result as string).split(',')[1]);
        }
      };
      
      // Fallback if image load fails but file read worked
      img.onerror = () => resolve((event.target?.result as string).split(',')[1]);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Helper to convert file to base64 (Standard)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  // Use compression by default for better performance
  return compressImage(file); 
};

/**
 * Analyze symptoms using Gemini with structured questioning flow and patient context
 */
export const analyzeSymptoms = async (
  prompt: string,
  history: string[],
  images: string[],
  language: string,
  patientContext?: string
): Promise<AnalysisResponse> => {
  
  const targetLanguage = getLanguageName(language);

  const systemInstruction = `You are MediScan AI, an expert medical diagnostic assistant.
  Your goal is to conduct a thorough triage assessment and provide HIGHLY DETAILED, EDUCATIONAL medical guidance.
  
  PATIENT CONTEXT: ${patientContext || 'Adult (Standard)'}. 
  
  PROTOCOL:
  1. Act as a doctor conducting an interview.
  2. IMAGE INPUT: If an image is provided, PRIORITIZE visual analysis. Describe color, texture, shape, and location in detail.
  3. TEXT INPUT: Analyze the user's description deeply.
  
  OUTPUT REQUIREMENTS:
  1. LANGUAGE: The ENTIRE response (all JSON values) MUST be in ${targetLanguage}. This is critical.
  2. DETAIL LEVEL: **EXTREMELY VERBOSE**. 
     - 'detailedAnalysis': This field MUST be a long, thorough essay (minimum 500 words). Explain the medical reasoning, potential causes, anatomy involved, pathophysiology, why the symptoms match, and specific care advice. Use paragraphs, not just bullet points.
     - 'visualAnalysis': Describe findings in detail (min 100 words).
     - 'differentialDiagnosis': Provide detailed 'reasoning' (min 50 words per condition).
  
  RISK STRATIFICATION:
  - Clearly state if home care is appropriate or if a doctor visit is required.
  - Be conservative with safety.

  JSON FORMAT ONLY.
  `;

  const parts: any[] = [];
  
  // Add images
  images.forEach(img => {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img
      }
    });
  });

  // Add text prompt
  parts.push({
    text: `Conversation History:\n${history.join('\n')}\n\nUser Input: ${prompt}\n\nIMPORTANT: Provide a very detailed, long response in ${targetLanguage}.`
  });

  try {
    const response = await ai.models.generateContent({
      model: COMPLEX_MODEL,
      contents: { parts },
      config: {
        // High thinking budget for deep medical analysis
        thinkingConfig: { thinkingBudget: 4096 }, 
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["in_progress", "complete"] },
            nextQuestion: { type: Type.STRING, description: "Follow up question in the target language if status is in_progress" },
            
            // Fields for complete status
            summary: { type: Type.STRING, description: "A short title for the condition in target language" },
            visualAnalysis: {
              type: Type.OBJECT,
              properties: {
                color: { type: Type.STRING },
                texture: { type: Type.STRING },
                shape: { type: Type.STRING },
                location: { type: Type.STRING },
                findings: { type: Type.STRING, description: "Detailed visual findings in target language" }
              }
            },
            differentialDiagnosis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  condition: { type: Type.STRING, description: "Name of condition in target language" },
                  likelihood: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  reasoning: { type: Type.STRING, description: "Detailed reasoning in target language (min 50 words)" },
                  severity: { type: Type.STRING, enum: ["Emergency", "High", "Moderate", "Low"] },
                  action: { type: Type.STRING, description: "Recommended action in target language" }
                }
              }
            },
            detailedAnalysis: { type: Type.STRING, description: "A comprehensive, multi-paragraph medical explanation (minimum 500 words) in markdown format in the target language." },
            triageLevel: { type: Type.STRING, enum: [TriageLevel.LOW, TriageLevel.MEDIUM, TriageLevel.HIGH, TriageLevel.EMERGENCY] },
            confidenceScore: { type: Type.NUMBER },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            disclaimer: { type: Type.STRING, description: "Medical disclaimer in target language" }
          },
          required: ["status", "disclaimer"]
        }
      }
    });

    if (response.text) {
      // Sanitize JSON
      let cleanText = response.text.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleanText) as AnalysisResponse;
      // Fallback: If status is complete but summary is missing
      if (parsed.status === 'complete' && !parsed.summary) {
        if (parsed.differentialDiagnosis && parsed.differentialDiagnosis.length > 0) {
            parsed.summary = parsed.differentialDiagnosis[0].condition;
        } else {
            parsed.status = 'in_progress';
            parsed.nextQuestion = "Could you provide more details?";
        }
      }
      return parsed;
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

/**
 * Scan Medication using Gemini
 */
export const scanMedication = async (
  image: string,
  existingMedications: string[],
  language: string
): Promise<MedicationResponse> => {
  
  const targetLanguage = getLanguageName(language);
  
  const interactionPrompt = existingMedications.length > 0 
    ? `PERFORM A DRUG INTERACTION CHECK against this list of existing medications: ${existingMedications.join(', ')}.`
    : `There are no existing medications to check against. Return an empty interaction list.`;

  const systemInstruction = `You are a Medication Safety Scanner. 
  1. Identify the medication in the image (pill appearance, bottle label, imprint codes).
  2. Extract details: Name, Dosage, Manufacturer.
  3. CATEGORIZE: Identify the Body Part/System it treats and Conditions.
  4. ${interactionPrompt}
  
  OUTPUT REQUIREMENTS:
  1. LANGUAGE: Translate ALL output values (Name, Usage, Warnings, Side Effects, etc.) into ${targetLanguage}.
  2. DETAIL LEVEL: Provide COMPREHENSIVE details. 
     - 'usageInstructions': Detailed, step-by-step.
     - 'warnings': Detailed list.
     - 'interactionsWithList': Explain the mechanism of interaction clearly.
  
  Return JSON only.`;

  try {
    const response = await ai.models.generateContent({
      model: COMPLEX_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: image } },
          { text: `Identify this medication, check for interactions, and provide detailed usage instructions in ${targetLanguage}.` }
        ]
      },
      config: {
        // Moderate thinking budget for extracting details and reasoning about interactions
        thinkingConfig: { thinkingBudget: 1024 },
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            genericName: { type: Type.STRING },
            dosage: { type: Type.STRING },
            type: { type: Type.STRING, description: "Pill, Capsule, Liquid, etc." },
            treatsBodyPart: { type: Type.STRING, description: "Main body system treated in target language" },
            treatsConditions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of conditions treated in target language" },
            uses: { type: Type.ARRAY, items: { type: Type.STRING } },
            sideEffects: {
              type: Type.OBJECT,
              properties: {
                common: { type: Type.ARRAY, items: { type: Type.STRING } },
                rare: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            usageInstructions: { type: Type.STRING, description: "Detailed usage instructions in target language" },
            missedDose: { type: Type.STRING, description: "Instructions for missed dose in target language" },
            storage: { type: Type.STRING, description: "Storage instructions in target language" },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed warnings in target language" },
            interactionsWithList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drugName: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["None", "Minor", "Moderate", "Major", "Contraindicated"] },
                  description: { type: Type.STRING, description: "Description of interaction in target language" },
                  mechanism: { type: Type.STRING },
                  action: { type: Type.STRING, description: "Recommended action in target language" }
                }
              }
            },
            isExpired: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER }
          },
          required: ["name", "dosage", "usageInstructions", "interactionsWithList", "warnings", "confidence", "treatsBodyPart"]
        }
      }
    });

    if (response.text) {
      // Sanitize JSON
      let cleanText = response.text.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanText) as MedicationResponse;
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Gemini Medication Error:", error);
    throw error;
  }
};

/**
 * Generate Health Insights and Patterns
 */
export const generateHealthInsights = async (history: HealthRecord[], language: string): Promise<HealthInsight> => {
  const targetLanguage = getLanguageName(language);

  if (history.length === 0) {
    return {
      summary: targetLanguage === 'Spanish' ? "No hay registros de salud disponibles." : "No health records available to analyze.",
      patterns: [],
      recommendations: [],
      generatedAt: Date.now()
    };
  }

  // Create a simplified version of history to save tokens
  const simpleHistory = history.map(h => ({
    id: h.id,
    date: new Date(h.date).toISOString(),
    type: h.type,
    summary: h.summary,
    details: h.details,
    notes: h.notes
  }));

  const systemInstruction = `You are a medical data analyst. Analyze the patient's health history JSON.
  
  TASKS:
  1. Identify RECURRING PATTERNS.
  2. Identify CORRELATIONS.
  3. Identify TRENDS.
  4. Generate a Doctor's Summary.
  5. Provide Preventive Recommendations.

  LANGUAGE: The ENTIRE output must be in ${targetLanguage}.
  Return JSON only.`;

  const response = await ai.models.generateContent({
    model: COMPLEX_MODEL,
    contents: {
      parts: [{ text: JSON.stringify(simpleHistory) }]
    },
    config: {
      // High thinking budget for complex pattern recognition and insights
      thinkingConfig: { thinkingBudget: 2048 },
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "Summary in target language" },
          patterns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["trend", "recurrence", "correlation", "alert"] },
                title: { type: Type.STRING, description: "Title in target language" },
                description: { type: Type.STRING, description: "Description in target language" },
                severity: { type: Type.STRING, enum: ["positive", "neutral", "negative"] },
                relatedRecords: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["summary", "patterns", "recommendations"]
      }
    }
  });

  if (response.text) {
    // Sanitize JSON
    let cleanText = response.text.replace(/```json\n?|```/g, '').trim();
    const data = JSON.parse(cleanText);
    return { ...data, generatedAt: Date.now() };
  }
  throw new Error("Failed to generate insights");
};

/**
 * Get Structured First Aid Guide
 */
export const getFirstAidGuide = async (emergencyType: string, language: string): Promise<FirstAidGuide> => {
  const targetLanguage = getLanguageName(language);
  
  const systemInstruction = `You are a First Aid Expert. Provide a structured, step-by-step guide for the emergency: "${emergencyType}".
  
  GUIDELINES:
  - Be clear, concise, and life-saving focused.
  - Break down into simple steps.
  - Indicate if a step requires timing (e.g., CPR rate).
  
  LANGUAGE: The ENTIRE output must be in ${targetLanguage}.
  Return JSON only.`;

  const response = await ai.models.generateContent({
    model: FAST_MODEL, // Using FAST model for immediate retrieval
    contents: { parts: [{ text: "Generate guide." }] },
    config: {
      // FAST_MODEL (Flash) does not require thinkingConfig. 
      // This improves speed and avoids compatibility issues with preview features.
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title in target language" },
          severity: { type: Type.STRING, enum: ["Critical", "Urgent", "Moderate"] },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Step title in target language" },
                instruction: { type: Type.STRING, description: "Instruction in target language" },
                hasTimer: { type: Type.BOOLEAN },
                timerSeconds: { type: Type.NUMBER },
                warning: { type: Type.STRING, description: "Warning in target language" }
              }
            }
          },
          postEmergency: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "severity", "steps", "postEmergency"]
      }
    }
  });

  if (response.text) {
    // Sanitize JSON
    let cleanText = response.text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanText) as FirstAidGuide;
  }
  
  // Fallback
  return {
    title: emergencyType,
    severity: "Critical",
    steps: [{ title: "Seek Help", instruction: "Call emergency services immediately.", hasTimer: false }],
    postEmergency: ["Wait for ambulance"]
  };
};

/**
 * Emergency Triage Quick Check
 */
export const getEmergencyInstructions = async (input: string, language: string): Promise<string> => {
  const targetLanguage = getLanguageName(language);
  const response = await ai.models.generateContent({
    model: FAST_MODEL, // Using FAST model for immediate response
    contents: `Provide immediate, step-by-step first aid instructions for: "${input}". 
    Format as Markdown. 
    LANGUAGE: Respond in ${targetLanguage} ONLY.
    Be concise. Start with bold WARNING if needed.`,
    // Removed thinkingConfig for Flash model
  });
  return response.text || "Seek immediate professional medical help.";
};