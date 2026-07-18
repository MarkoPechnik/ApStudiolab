export const aiService = {
  async getFeedback(content: string): Promise<string> {
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error("Feedback proxy request failed");
      }
      const data = await response.json();
      return data.text || "No feedback generated.";
    } catch (error) {
      console.error("AI Feedback Error:", error);
      return "Unable to generate feedback at this time.";
    }
  },

  async proposeEQs(interests: string): Promise<string[]> {
    try {
      const response = await fetch("/api/propose-eqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      });
      if (!response.ok) {
        throw new Error("EQ proposal proxy query failed");
      }
      const data = await response.json();
      return Array.isArray(data.eqs) ? data.eqs : [];
    } catch (error) {
      console.error("AI EQ Error:", error);
      return [];
    }
  }
};
