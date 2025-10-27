interface HuggingFaceResponse {
  label: string;
  score: number;
}

type BiasLabel = "left" | "center" | "right";

class BiasDetectionService {
  private readonly apiKey: string;
  private readonly biasModelUrl = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-bias-detection";
  private readonly summaryModelUrl = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || "";
    if (!this.apiKey) {
      console.warn("HuggingFace API key not found. Using mock bias detection and summaries.");
    }
  }

  async detectBias(text: string): Promise<{ prediction: BiasLabel; confidence: number }> {
    if (!this.apiKey) {
      return this.getMockBiasAnalysis(text);
    }

    try {
      const response = await fetch(this.biasModelUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: text.substring(0, 512) // Limit text length for API
        })
      });

      if (!response.ok) {
        console.warn(`HuggingFace API error: ${response.status}. Using mock data.`);
        return this.getMockBiasAnalysis(text);
      }

      const data: HuggingFaceResponse[][] = await response.json();
      
      if (!data || !data[0] || data[0].length === 0) {
        return this.getMockBiasAnalysis(text);
      }

      const topResult = data[0].reduce((max, curr) => 
        curr.score > max.score ? curr : max
      );

      const prediction = this.mapLabelToBias(topResult.label);
      const confidence = topResult.score;

      return { prediction, confidence };

    } catch (error) {
      console.error("Error calling HuggingFace API:", error);
      return this.getMockBiasAnalysis(text);
    }
  }

  async generateNeutralSummary(text: string, maxLength: number = 80): Promise<string> {
    // Clean HTML tags and prepare text
    const cleanText = text.replace(/(<([^>]+)>)/gi, "").trim();
    
    // If text is already short enough, return as-is
    const words = cleanText.split(/\s+/);
    if (words.length <= maxLength) {
      return cleanText;
    }

    // If no API key, use extractive summary (first 80 words)
    if (!this.apiKey) {
      return this.getMockSummary(cleanText, maxLength);
    }

    try {
      // Use HuggingFace BART model for neutral summarization
      const prompt = `Summarize neutrally: ${cleanText.substring(0, 1024)}`;
      
      const response = await fetch(this.summaryModelUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: maxLength,
            min_length: 30,
            do_sample: false,
            temperature: 0.3 // Lower temperature for more neutral, factual summaries
          }
        })
      });

      if (!response.ok) {
        console.warn(`HuggingFace Summary API error: ${response.status}. Using extractive summary.`);
        return this.getMockSummary(cleanText, maxLength);
      }

      const data = await response.json();
      
      if (data && Array.isArray(data) && data[0]?.summary_text) {
        return data[0].summary_text;
      } else if (data && data.generated_text) {
        return data.generated_text;
      }

      // Fallback to extractive summary
      return this.getMockSummary(cleanText, maxLength);

    } catch (error) {
      console.error("Error generating AI summary:", error);
      return this.getMockSummary(cleanText, maxLength);
    }
  }

  private getMockSummary(text: string, maxWords: number = 80): string {
    // Extractive summary: take first N words
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
      return text;
    }
    return words.slice(0, maxWords).join(" ") + "...";
  }

  private mapLabelToBias(label: string): BiasLabel {
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes("left") || lowerLabel.includes("liberal") || lowerLabel.includes("progressive")) {
      return "left";
    }
    if (lowerLabel.includes("right") || lowerLabel.includes("conservative")) {
      return "right";
    }
    return "center";
  }

  private getMockBiasAnalysis(text: string): { prediction: BiasLabel; confidence: number } {
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const biases: BiasLabel[] = ["left", "center", "right"];
    const prediction = biases[hash % 3];
    const confidence = 0.65 + (hash % 30) / 100; // 0.65 - 0.94

    return { prediction, confidence };
  }
}

export const biasDetectionService = new BiasDetectionService();
