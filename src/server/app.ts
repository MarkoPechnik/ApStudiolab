import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const systemPrompt = `You are an expert AP Art and Design instructor. 
Your goal is to help students refine their written evidence and artwork descriptions for their Sustained Investigation or Selected Works.
The College Board requires students to:
- Formulate questions that guide a sustained investigation through practice, experimentation, and revision.
- Demonstrate evidence of practice, experimentation, and revision guided by questions in a sustained investigation.
- Select and use materials, processes, and ideas.

Guidelines for helpful assistance:
1. Be concise (strict limits apply: Written Evidence max 600 chars, Artwork Descriptions max 100 chars).
2. The writing must be clear, direct, and specific. It must not be poetic, hyperbolic, or vague.
3. Reject vague phrases like "I wanted to express emotion" or "this shows human struggle." Instead, advise/generate direct, visible choices: "I used repeated cropping, red lighting, and close-up hands to show anxiety around social performance."
4. Use specific artistic vocabulary (synthesis, materiality, composition, etc.) dynamically but clearly.
5. In brainstorm mode, ask guiding questions rather than just providing the answer.
6. Encourage the student to reference specific pieces of their work.
7. If the student has already written something, help them improve its clarity and depth.

When helping with:
- Inquiry: Help define the 'WHY' and the guiding question. (Max 600 Characters)
- Practice, Experimentation, & Revision: Help describe how the work changed over time. Encourage mentioning specific attempts, refinements, or abandonments. (Max 600 Characters)
- Ideas: Help summarize the artistic 'why' or conceptual intent behind a specific piece in under 100 characters.
- Process: Help describe the physical or technical steps taken to create the work in under 100 characters.`;

const app = express();

// Max size configuration to allow PDF transfers
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini Client with standard headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", apiConfigured: !!process.env.GEMINI_API_KEY });
});

// --- Gemini API Proxy Ports ---

// 1. AP Portfolio Feedback
app.post("/api/feedback", async (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") {
    return res.status(400).json({ error: "Invalid content format" });
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Student Portfolio Content:\n${content}`,
      config: {
        systemInstruction: `You are an expert AP Art & Design consultant. 
Evaluate the student's work based on the AP Rubric:
- Practice: Repeated use of materials, processes, and/or ideas.
- Experimentation: Testing materials, processes, and ideas.
- Revision: Making a purposeful change, correction, or improvement.
- Synthesis: Coalescence/integration of materials, processes, and ideas.

Provide specific, constructive feedback focused on clarity, inquiry, and the relationship between ideas and making. 
DO NOT write the text for the student. Max 150 words.`
      }
    });
    res.json({ text: response.text || "No feedback generated." });
  } catch (error: any) {
    console.error("Express feedback error:", error);
    res.status(500).json({ error: error.message || "Failed to generate feedback." });
  }
});

// 2. AP Sustained Investigation EQ Proposals
app.post("/api/propose-eqs", async (req, res) => {
  const { interests } = req.body;
  if (typeof interests !== "string") {
    return res.status(400).json({ error: "Invalid interests format" });
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Student Interests/Topic:\n${interests}`,
      config: {
        systemInstruction: `Propose 3 distinct, high-quality Essential Questions for an AP Art Sustained Investigation. 
Questions should be open-ended and imply a search for meaning/process based on student interests.

Examples of good quality: "How can I use the translucency of vellum to represent memory?" or "In what ways can industrial textures evoke a sense of isolation?"`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const json = JSON.parse(response.text || "[]");
    res.json({ eqs: json });
  } catch (error: any) {
    console.error("Express EQ Proposal error:", error);
    res.status(500).json({ error: error.message || "Failed to suggest questions." });
  }
});

// 3. Written Evidence Brainstorm Suggestions
app.post("/api/brainstorm", async (req, res) => {
  const { type, currentText, otherContext } = req.body;
  if (typeof type !== "string" || (currentText && typeof currentText !== "string") || (otherContext && typeof otherContext !== "string")) {
    return res.status(400).json({ error: "Invalid input parameters" });
  }
  try {
    const prompt = `Student is working on their '${type}' written evidence.
Draft: "${currentText || "No draft yet"}"
Inquiry Context: "${otherContext || "None"}"

Please provide 2-3 short, concrete suggestions or guiding questions to help the student improve this specific section. Focus on AP Portfolio standards. Keep under 400 characters.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
      },
    });
    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Express brainstorm error:", error);
    res.status(500).json({ error: error.message || "Brainstorm error" });
  }
});

// 4. Written Evidence Draft Refiner
app.post("/api/refine", async (req, res) => {
  const { type, currentText, otherContext } = req.body;
  if (typeof type !== "string" || typeof currentText !== "string" || (otherContext && typeof otherContext !== "string")) {
    return res.status(400).json({ error: "Invalid input parameters" });
  }
  const limit = type === "ideas" || type === "processText" ? 100 : 600;
  try {
    const prompt = `Refine this student's '${type}' written evidence. 
Current Draft: "${currentText}"
Additional Context: "${otherContext || "None"}"

Maintain the student's original voice but improve vocabulary, structure, and alignment with AP standards. 
The response MUST be under ${limit} characters. 
Provide ONLY the refined text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
      },
    });
    res.json({ text: response.text || currentText });
  } catch (error: any) {
    console.error("Express refiner error:", error);
    res.status(500).json({ error: error.message || "Refiner error", fallback: currentText });
  }
});

// 5. School Calendar PDF Analyzer / Parser
app.post("/api/parse-calendar-pdf", async (req, res) => {
  const { pdfBase64 } = req.body;
  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return res.status(400).json({ error: "Missing or invalid calendar pdfBase64 payload" });
  }

  try {
    const pdfPart = {
      inlineData: {
        data: pdfBase64,
        mimeType: "application/pdf",
      },
    };

    const systemInstruction = `Analyze this school's academic calendar document and automatically extract:
1. The first day of school (the date when students actually start classes for the academic fall term, e.g. '2025-08-25').
2. All primary holidays, recesses, term breaks, spring/winter breaks, and other official scheduled off-days for students. Ignore normal weekend days unless they are listed as part of a longer break.

Look for key events such as:
- Thanksgiving Break / recess
- Winter break / winter holiday
- Spring break
- Labor Day, Memorial Day, MLK Day, Presidents Day
- In-service or Teacher workshop days when students do not attend.

Calculate or extract the precise start and end dates of each off-day range. If it is a single holiday/day-off, the startDate and endDate should be the same.
Return a structured JSON object matching this typescript schema: { firstDayOfSchool: string; breaks: Array<{ name: string; startDate: string; endDate: string; }> } where date values are in YYYY-MM-DD string format (for example, '2025-08-25' or '2025-11-27').
Filter out entries that fall outside normal academic terms or represent active school days. 
Provide ONLY the clean parsed JSON output, strictly verifying structured dates. Do not include markdown codeblocks or explanatory texts outside the JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [pdfPart],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstDayOfSchool: { type: Type.STRING, description: "First day of school / classes starting in YYYY-MM-DD format" },
            breaks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Compact holiday/break label, e.g. Thanksgiving Recess" },
                  startDate: { type: Type.STRING, description: "Start format: YYYY-MM-DD" },
                  endDate: { type: Type.STRING, description: "End format: YYYY-MM-DD" },
                },
                required: ["name", "startDate", "endDate"],
              },
            },
          },
          required: ["firstDayOfSchool", "breaks"],
        },
      },
    });

    const text = response.text || "{}";
    let parsedData = { firstDayOfSchool: "", breaks: [] };
    try {
      parsedData = JSON.parse(text.trim());
    } catch (parseErr) {
      // Fallback or double cleanse in case the model returns markdown wrapper
      const cleanse = text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanse);
    }

    res.json(parsedData);
  } catch (err: any) {
    console.error("PDF Parsing Backend Error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze and parse calendar PDF." });
  }
});

// 6. Summarize Student Reflection
app.post("/api/summarize-reflection", async (req, res) => {
  const { selfReflection } = req.body;
  if (!selfReflection) {
    return res.status(400).json({ error: "Missing selfReflection data" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Student Self-Ratings (Self-Grades 1 to 3):
- Inquiry: ${selfReflection.rubricScores?.criteria1 || "N/A"}/3
- Practice, Experimentation & Revision: ${selfReflection.rubricScores?.criteria2 || "N/A"}/3
- Materials, Processes & Ideas Synthesis: ${selfReflection.rubricScores?.criteria3 || "N/A"}/3

Student's Written Responses to Reflections:
1. Key visual discovery/breakthrough: "${selfReflection.responses?.prompt1 || "None"}"
2. Moment of revision or abandonment: "${selfReflection.responses?.prompt2 || "None"}"
3. Evolution of materials and processes: "${selfReflection.responses?.prompt3 || "None"}"`,
      config: {
        systemInstruction: `You are an expert AP Art and Design educator summarizing a student's self-reflection before their portfolio is graded.
Provide an elegant, professional summary for the teacher. Highlight:
- Quick theme/ideas focus of student
- Core challenges they identified
- How they rate their own progress

Keep it strictly bulleted, positive, and under 400 characters max so it is fast for a teacher to read.`
      }
    });

    res.json({ summary: response.text || "No reflection summary generated." });
  } catch (error: any) {
    console.error("Express reflection summary error:", error);
    res.status(500).json({ error: error.message || "Failed to summarize reflection." });
  }
});

// 6b. Summarize Individual Project Reflection
app.post("/api/summarize-project-reflection", async (req, res) => {
  const { title, materials, processText, studentReflection } = req.body;
  if (!studentReflection || typeof studentReflection !== "string") {
    return res.status(400).json({ error: "Missing or invalid studentReflection data" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Project Context:
- Title: "${title || "Untitled"}"
- Materials Used: "${materials || "N/A"}"
- Process: "${processText || "N/A"}"

Student's Personal Self-Reflection on this piece:
"${studentReflection}"`,
      config: {
        systemInstruction: `You are an expert AP Art and Design educator summarizing a student's individual project reflection for their teacher.
Provide an elegant, professional summary for the teacher. Highlight:
- Quick artistic motivation / core theme of this specific piece
- Artistic process breakthrough or challenge solved
- How it ties to their Sustained Investigation (SI) inquiry

Keep it strictly bulleted, positive, and under 300 characters max so the teacher can read it in 15 seconds. Ensure it is polite and constructive.`
      }
    });

    res.json({ summary: response.text || "No project reflection summary generated." });
  } catch (error: any) {
    console.error("Express project reflection summary error:", error);
    res.status(500).json({ error: error.message || "Failed to summarize project reflection." });
  }
});

// 6c. Generate Inquiry Vocabulary Suggestions
app.post("/api/generate-vocabulary", async (req, res) => {
  const { who, what, how } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Student's sketchbook reflection:
1. Who You Are (Identity, backgrounds, experiences): "${who || "N/A"}"
2. What You Like (Subjects, animals, structures, concepts): "${what || "N/A"}"
3. How You Work (Mediums, material techniques, textures, lighting): "${how || "N/A"}"`,
      config: {
        systemInstruction: `You are an expert AP Art and Design educator.
We are helping a student brainstorm custom inquiry keywords (themes, concepts, materials, and processes) for their Sustained Investigation.

Based on the student's sketchbook reflection, generate a large list of 25 to 50 distinct, inspiring, and professional-grade art vocabulary terms.
The vocabulary must be categorized into two groups:
- "subject" (representing concepts, themes, visual narratives, subjects, psychological ideas, or historical issues).
- "medium" (representing actual physical materials, techniques, textures, experimental mediums, lighting styles, compositions, or processes).

Requirements:
- Propose exactly 25 to 50 terms total.
- Ensure the terms are highly tailored and specifically inspired by the student's answers (e.g. if upbringing or nature is mentioned, create terms that evoke those motifs).
- Keep terms compact: 1-3 words max per term (e.g. "ecological mourning", "unrefined graphite", "organic erosion", "translucent washes"). No long sentences.
- Avoid generic filler words.

Return a JSON object containing the array of terms of choice.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING, description: "Compact, evocative 1-3 word art term or process" },
                  category: { type: Type.STRING, enum: ["subject", "medium"], description: "The classification" }
                },
                required: ["term", "category"]
              }
            }
          },
          required: ["vocabulary"]
        }
      }
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText.trim()));
  } catch (error: any) {
    console.error("Vocabulary Generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate vocabulary suggestions." });
  }
});

// 7. AP AI Reader Judge Assessment
app.post("/api/ai-judge", async (req, res) => {
  const { writtenEvidence, artworks, teacherFeedbackText } = req.body;
  try {
    // Create a compact list of artworks for prompt context
    const artsSnippet = (artworks || [])
      .map((art: any, i: number) => `Piece ${i + 1} (${art.type || "SI"}):
      - Materials: "${art.materials || "N/A"}"
      - Processes: "${art.processText || "N/A"}"
      - Ideas/Context: "${art.ideas || "N/A"}"
      - Digital Tools: "${art.digitalTools || "None"}"`)
      .join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Student Written Evidence:
- Inquiry Question: "${writtenEvidence?.inquiry || "N/A"}"
- Practice: "${writtenEvidence?.practice || "N/A"}"
- Experimentation: "${writtenEvidence?.experimentation || "N/A"}"
- Revision: "${writtenEvidence?.revision || "N/A"}"

Student Artworks:
${artsSnippet}

Current Teacher Feedback Draft/Text:
"${teacherFeedbackText || "None provided yet."}"`,
      config: {
        systemInstruction: `You are the expert AP Art Critique Companion. Conduct a Standard alignment review of the portfolio following the official College Board AP Sustained Investigation standards and guidelines.

Assess each of the 3 criteria:
1. Inquiry & Written Evidence.
2. Practice, Experimentation, and Revision (Growth over time).
3. Synthesis of Materials, Processes, and Ideas.

In the "gapAnalysis" field, identify any structural blindspots or gaps between standard AP expectations and current student progress to help the instructor provide targeted support.

Return a clean JSON object according to the requested schema. Make justifications highly constructive, specific, and direct, keeping all responses under 400 characters max per field. Do not include markdown codeblocks.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            inquiryScore: { type: Type.INTEGER, description: "Score from 1 to 3" },
            inquiryJustification: { type: Type.STRING, description: "Justification of the inquiry score" },
            practiceScore: { type: Type.INTEGER, description: "Score from 1 to 3" },
            practiceJustification: { type: Type.STRING, description: "Justification of the practice/experimentation score" },
            synthesisScore: { type: Type.INTEGER, description: "Score from 1 to 3" },
            synthesisJustification: { type: Type.STRING, description: "Justification of the synthesis score" },
            overallFeedback: { type: Type.STRING, description: "Overall feedback and recommendations" },
            gapAnalysis: { type: Type.STRING, description: "AP reader insights, highlighting gaps or missing aspects" },
          },
          required: [
            "inquiryScore", "inquiryJustification",
            "practiceScore", "practiceJustification",
            "synthesisScore", "synthesisJustification",
            "overallFeedback", "gapAnalysis"
          ],
        },
      },
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("AP Reader Critique Companion error:", error);
    res.status(500).json({ error: error.message || "Failed to generate critique companion evaluation." });
  }
});

// 7b. Verify Student Peer Critique / AI Reflection mentor
app.post("/api/verify-peer-critique", async (req, res) => {
  const { text, artworkContext } = req.body;
  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "Critique text is required" });
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Student peer critique feedback text:
"${text}"

Artwork details (for reference):
${artworkContext ? JSON.stringify(artworkContext) : "N/A"}`,
      config: {
        systemInstruction: `You are an expert AP Art and Design educator. Review a student's peer critique/feedback on their classmate's artwork.

The peer critique must fulfill the following criteria:
1. Length requirement: It must be a comprehensive reflection, consisting of at least 4 full sentences.
2. No generic feedback or low-effort praise: Praise like "I think your work is cool," "Looks good," or "I like the colors" without further explanation or description is strictly prohibited.
3. Language requirement: It must incorporate specific terminology regarding the Elements and Principles of Design (such as: line, shape, form, space, color, value, texture, balance, contrast, emphasis, movement, pattern, rhythm, unity, variety, scale, proportion, focal point, materiality) to describe what the work is doing.
4. Quality and depth: It must encourage thoughtful, concise descriptions comparing what classmate's work is doing versus how it is made.

Evaluate the text.
Identify:
- How many sentences are there exactly (sentencesCount value).
- Which Elements/Principles design terminology are actually used in the text.
- Rate the critiqueQuality as "excellent" (met all criteria with great depth), "basic" (met minimum sentence count, but terminology is light or feedback is shallow), or "vague_or_insufficient" (under 4 sentences, generic praise, or zero design terminology).
- Decide whether the feedback is "isValid" (true if critiqueQuality is "excellent" or "basic"; false if it is "vague_or_insufficient").
- Provide a "reasoning" message directly speaking to the student writer.
  - If not valid, explain WHY, list what is missing, and give a supportive, concrete example of how they can expand and refine this draft into a rich, four-sentence design-oriented critique. Speak directly to the student: "To make your reflection stronger, try describing..."
  - If valid, give them a warm, professional word of encouragement highlighting what they did well.

Return a structured JSON object according to the requested schema.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN, description: "Whether the peer critique is valid according to the AP style criteria." },
            sentencesCount: { type: Type.INTEGER, description: "Count of actual sentences." },
            designTerminologyUsed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of Elements and Principles of Design terminology detected in the critique."
            },
            critiqueQuality: {
              type: Type.STRING,
              enum: ["excellent", "basic", "vague_or_insufficient"],
              description: "Quality rating of the critique."
            },
            reasoning: {
              type: Type.STRING,
              description: "Personal critique mentoring feedback directed to the writer, encouraging them or coaching them with specific examples / terms to add."
            }
          },
          required: ["isValid", "sentencesCount", "designTerminologyUsed", "critiqueQuality", "reasoning"]
        }
      }
    });

    const responseText = response.text || "{}";
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("AI verify peer critique error:", error);
    res.status(500).json({ error: error.message || "Failed to verify classmate critique." });
  }
});

export default app;
