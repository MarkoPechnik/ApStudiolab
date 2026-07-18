export type EvidenceType = 'inquiry' | 'practice' | 'experimentation' | 'revision' | 'ideas' | 'processText';

export const geminiService = {
  async brainstormResponse(type: EvidenceType, currentText: string, otherContext?: string): Promise<string> {
    try {
      const response = await fetch("/api/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, currentText, otherContext }),
      });
      if (!response.ok) {
        throw new Error("Brainstorm proxy request failed");
      }
      const data = await response.json();
      return data.text || "I'm having trouble connecting to my creative brain right now. Please try again later.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Something went wrong. Please check your connection and try again.";
    }
  },

  async refineDraft(type: EvidenceType, currentText: string, otherContext?: string): Promise<string> {
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, currentText, otherContext }),
      });
      if (!response.ok) {
        throw new Error("Refine proxy request failed");
      }
      const data = await response.json();
      return data.text || currentText;
    } catch (error) {
      console.error("Gemini Error:", error);
      return currentText;
    }
  }
};
