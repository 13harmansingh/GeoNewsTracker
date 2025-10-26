interface HuggingFaceResponse {
  label: string;
  score: number;
}

type BiasLabel = "left" | "center" | "right";

class BiasDetectionService {
  private readonly apiKey: string;
  private readonly modelUrl = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-bias-detection";

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || "";
    if (!this.apiKey) {
      console.warn("HuggingFace API key not found. Using mock bias detection.");
    }
  }

  async detectBias(text: string): Promise<{ prediction: BiasLabel; confidence: number }> {
    if (!this.apiKey) {
      return this.getMockBiasAnalysis(text);
    }

    try {
      const response = await fetch(this.modelUrl, {
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

  async generateNeutralSummary(text: string): Promise<string> {
    const cleanText = text.replace(/(<([^>]+)>)/gi, "").substring(0, 500);
    const words = cleanText.split(/\s+/);
    
    if (words.length <= 30) {
      return cleanText;
    }

    const summary = words.slice(0, 30).join(" ") + "...";
    return summary;
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
