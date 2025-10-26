import type { InsertMediaOwnership } from "@shared/schema";

export const MOCK_OWNERSHIP_DATA: InsertMediaOwnership[] = [
  {
    sourceName: "CNN",
    ownershipData: {
      "BlackRock": 55,
      "AT&T": 31.3,
      "Vanguard": 8.7,
      "State Street": 5
    }
  },
  {
    sourceName: "BBC",
    ownershipData: {
      "UK Government": 52,
      "License Fee Payers": 48
    }
  },
  {
    sourceName: "Fox News",
    ownershipData: {
      "News Corp": 65,
      "Vanguard": 15,
      "BlackRock": 12,
      "State Street": 8
    }
  },
  {
    sourceName: "The New York Times",
    ownershipData: {
      "The Ochs-Sulzberger Family": 42,
      "Vanguard": 25,
      "BlackRock": 18,
      "State Street": 10,
      "Public Shareholders": 5
    }
  },
  {
    sourceName: "Reuters",
    ownershipData: {
      "Thomson Reuters": 72,
      "Vanguard": 15,
      "BlackRock": 8,
      "Other Institutional": 5
    }
  },
  {
    sourceName: "The Guardian",
    ownershipData: {
      "Scott Trust Limited": 100
    }
  },
  {
    sourceName: "NDTV",
    ownershipData: {
      "Adani Group": 64.71,
      "AMG Media Networks": 29.18,
      "Others": 6.11
    }
  },
  {
    sourceName: "Times of India",
    ownershipData: {
      "Bennett, Coleman & Co": 100
    }
  },
  {
    sourceName: "The Hindu",
    ownershipData: {
      "The Hindu Group": 85,
      "Kasturi & Sons": 15
    }
  },
  {
    sourceName: "Al Jazeera",
    ownershipData: {
      "Qatar Media Corporation": 100
    }
  },
  {
    sourceName: "NBC News",
    ownershipData: {
      "Comcast": 51,
      "Vanguard": 20,
      "BlackRock": 16,
      "State Street": 8,
      "Others": 5
    }
  },
  {
    sourceName: "CBS News",
    ownershipData: {
      "Paramount Global": 48,
      "Vanguard": 22,
      "BlackRock": 18,
      "State Street": 7,
      "Others": 5
    }
  },
  {
    sourceName: "ABC News",
    ownershipData: {
      "The Walt Disney Company": 55,
      "Vanguard": 18,
      "BlackRock": 15,
      "State Street": 7,
      "Others": 5
    }
  },
  {
    sourceName: "Washington Post",
    ownershipData: {
      "Nash Holdings LLC (Jeff Bezos)": 100
    }
  },
  {
    sourceName: "Wall Street Journal",
    ownershipData: {
      "News Corp": 68,
      "Vanguard": 15,
      "BlackRock": 10,
      "Others": 7
    }
  }
];
