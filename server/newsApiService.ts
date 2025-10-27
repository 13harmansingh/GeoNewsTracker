import type { NewsArticle } from "@shared/schema";

export type SupportedLanguage = "en" | "pt" | "es" | "fr" | "de";

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  "in": { lat: 20.5937, lng: 78.9629, name: "India" },
  "us": { lat: 39.8283, lng: -98.5795, name: "United States" },
  "gb": { lat: 55.3781, lng: -3.4360, name: "United Kingdom" },
};

// Worldwide major city coordinates for diverse marker distribution
const WORLDWIDE_LOCATIONS: Array<{ lat: number; lng: number; name: string; region: string }> = [
  { lat: 40.7128, lng: -74.0060, name: "New York", region: "North America" },
  { lat: 51.5074, lng: -0.1278, name: "London", region: "Europe" },
  { lat: 48.8566, lng: 2.3522, name: "Paris", region: "Europe" },
  { lat: 35.6762, lng: 139.6503, name: "Tokyo", region: "Asia" },
  { lat: -33.8688, lng: 151.2093, name: "Sydney", region: "Australia" },
  { lat: 19.0760, lng: 72.8777, name: "Mumbai", region: "Asia" },
  { lat: -23.5505, lng: -46.6333, name: "São Paulo", region: "South America" },
  { lat: 55.7558, lng: 37.6176, name: "Moscow", region: "Europe" },
  { lat: 39.9042, lng: 116.4074, name: "Beijing", region: "Asia" },
  { lat: 6.5244, lng: 3.3792, name: "Lagos", region: "Africa" },
  { lat: -26.2041, lng: 28.0473, name: "Johannesburg", region: "Africa" },
  { lat: 25.2048, lng: 55.2708, name: "Dubai", region: "Middle East" },
  { lat: 19.4326, lng: -99.1332, name: "Mexico City", region: "North America" },
  { lat: 1.3521, lng: 103.8198, name: "Singapore", region: "Asia" },
  { lat: 52.5200, lng: 13.4050, name: "Berlin", region: "Europe" },
];

const LANGUAGE_TO_COUNTRIES: Record<SupportedLanguage, string[]> = {
  en: ['us', 'gb', 'au', 'ca', 'in'],
  pt: ['br', 'pt'],
  es: ['es', 'mx', 'ar', 'co'],
  fr: ['fr', 'ca', 'be'],
  de: ['de', 'at', 'ch'],
};

// Map languages to appropriate geographic regions for news distribution
const LANGUAGE_TO_REGIONS: Record<SupportedLanguage, string[]> = {
  en: ['North America', 'Europe', 'Asia', 'Australia', 'Africa', 'Middle East'],
  pt: ['South America', 'Europe'],
  es: ['South America', 'Europe', 'North America'],
  fr: ['Europe', 'North America', 'Africa'],
  de: ['Europe'],
};

class NewsAPIService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://newsapi.org/v2/top-headlines";

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || "";
    if (!this.apiKey) {
      console.warn("NewsAPI key not found. Using mock data for country headlines.");
    }
  }

  async getWorldwideHeadlines(language: SupportedLanguage = "en"): Promise<NewsArticle[]> {
    // Fetch headlines from multiple countries for true worldwide distribution
    if (!this.apiKey) {
      return this.getMockWorldwideHeadlines(language);
    }

    try {
      // Get countries for the specified language
      const countries = LANGUAGE_TO_COUNTRIES[language] || LANGUAGE_TO_COUNTRIES.en;
      const articlesPerCountry = Math.ceil(30 / countries.length); // Distribute to get ~30 articles
      
      console.log(`Fetching headlines from ${countries.length} countries for worldwide distribution...`);
      
      const allArticles: NewsAPIArticle[] = [];
      
      // Fetch from each country in parallel
      const promises = countries.map(async (country) => {
        try {
          const url = `${this.baseUrl}?country=${country}&pageSize=${articlesPerCountry}&apiKey=${this.apiKey}`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data: NewsAPIResponse = await response.json();
            return data.articles || [];
          }
          return [];
        } catch (error) {
          console.warn(`Failed to fetch from ${country}:`, error);
          return [];
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(articles => allArticles.push(...articles));

      if (allArticles.length === 0) {
        console.warn(`No articles found from any country`);
        return this.getMockWorldwideHeadlines(language);
      }

      // Filter locations based on language-appropriate regions
      const appropriateRegions = LANGUAGE_TO_REGIONS[language] || LANGUAGE_TO_REGIONS.en;
      const filteredLocations = WORLDWIDE_LOCATIONS.filter(loc => 
        appropriateRegions.includes(loc.region)
      );
      
      console.log(`📍 Using ${filteredLocations.length} locations from regions: ${appropriateRegions.join(', ')}`);

      // Distribute articles across language-appropriate locations
      // Take up to 30 articles (more than we need for diversity)
      return allArticles.slice(0, 30).map((article, index) => {
        const location = filteredLocations[index % filteredLocations.length]; // Cycle through filtered locations
        const randomOffset = 0.5;
        const lat = location.lat + (Math.random() - 0.5) * randomOffset;
        const lng = location.lng + (Math.random() - 0.5) * randomOffset;

        return {
          id: Date.now() + index,
          title: article.title,
          summary: article.description || article.title,
          content: article.content || article.description || article.title,
          category: "BREAKING",
          latitude: lat,
          longitude: lng,
          imageUrl: article.urlToImage,
          isBreaking: true,
          views: Math.floor(Math.random() * 1000) + 100,
          publishedAt: new Date(article.publishedAt),
          location: location.name,
          sourceUrl: article.url,
          sourceName: article.source.name,
          country: location.region,
          language,
          externalId: `newsapi-worldwide-${Date.now()}-${index}`,
          userId: null,
          isUserCreated: false,
        } as NewsArticle;
      });

    } catch (error) {
      console.error(`Error fetching NewsAPI headlines:`, error);
      return this.getMockWorldwideHeadlines(language);
    }
  }

  private getMockWorldwideHeadlines(language: SupportedLanguage = "en"): NewsArticle[] {
    console.log(`📰 Using mock data for language: ${language}`);
    
    const mockTitlesByLanguage: Record<SupportedLanguage, string[]> = {
      en: [
        "Global Markets Show Strong Recovery",
        "International Summit Addresses Climate Change",
        "Technology Innovation Transforms Healthcare",
        "Major Archaeological Discovery Announced",
        "Sports Championship Draws Record Viewers",
        "New Space Exploration Mission Launched",
        "Cultural Festival Celebrates Diversity",
        "Economic Growth Exceeds Expectations",
        "Scientific Breakthrough in Renewable Energy",
        "Historic Agreement Signed by World Leaders",
        "Educational Reform Initiative Unveiled",
        "Transportation Infrastructure Modernized",
        "Environmental Protection Measures Expanded",
        "Digital Security Standards Updated",
        "Community Development Project Succeeds"
      ],
      pt: [
        "Mercados Globais Mostram Forte Recuperação",
        "Cúpula Internacional Aborda Mudanças Climáticas",
        "Inovação Tecnológica Transforma Saúde",
        "Grande Descoberta Arqueológica Anunciada",
        "Campeonato Esportivo Atrai Recordes de Audiência",
        "Nova Missão de Exploração Espacial Lançada",
        "Festival Cultural Celebra Diversidade",
        "Crescimento Econômico Supera Expectativas",
        "Avanço Científico em Energia Renovável",
        "Acordo Histórico Assinado por Líderes Mundiais",
        "Iniciativa de Reforma Educacional Revelada",
        "Infraestrutura de Transporte Modernizada",
        "Medidas de Proteção Ambiental Expandidas",
        "Padrões de Segurança Digital Atualizados",
        "Projeto de Desenvolvimento Comunitário Bem-Sucedido"
      ],
      es: [
        "Los Mercados Globales Muestran Fuerte Recuperación",
        "Cumbre Internacional Aborda Cambio Climático",
        "Innovación Tecnológica Transforma Atención Médica",
        "Anunciado Gran Descubrimiento Arqueológico",
        "Campeonato Deportivo Atrae Récord de Espectadores",
        "Lanzada Nueva Misión de Exploración Espacial",
        "Festival Cultural Celebra Diversidad",
        "Crecimiento Económico Supera Expectativas",
        "Avance Científico en Energía Renovable",
        "Acuerdo Histórico Firmado por Líderes Mundiales",
        "Iniciativa de Reforma Educativa Revelada",
        "Infraestructura de Transporte Modernizada",
        "Medidas de Protección Ambiental Ampliadas",
        "Estándares de Seguridad Digital Actualizados",
        "Proyecto de Desarrollo Comunitario Exitoso"
      ],
      fr: [
        "Les Marchés Mondiaux Montrent une Forte Reprise",
        "Sommet International sur le Changement Climatique",
        "Innovation Technologique Transforme les Soins de Santé",
        "Découverte Archéologique Majeure Annoncée",
        "Championnat Sportif Attire un Nombre Record de Spectateurs",
        "Nouvelle Mission d'Exploration Spatiale Lancée",
        "Festival Culturel Célèbre la Diversité",
        "Croissance Économique Dépasse les Attentes",
        "Percée Scientifique dans l'Énergie Renouvelable",
        "Accord Historique Signé par des Leaders Mondiaux",
        "Initiative de Réforme Éducative Dévoilée",
        "Infrastructure de Transport Modernisée",
        "Mesures de Protection Environnementale Élargies",
        "Normes de Sécurité Numérique Mises à Jour",
        "Projet de Développement Communautaire Réussi"
      ],
      de: [
        "Globale Märkte Zeigen Starke Erholung",
        "Internationaler Gipfel Befasst sich mit Klimawandel",
        "Technologische Innovation Verändert Gesundheitswesen",
        "Bedeutende Archäologische Entdeckung Angekündigt",
        "Sportmeisterschaft Zieht Rekord-Zuschauerzahlen An",
        "Neue Weltraum-Forschungsmission Gestartet",
        "Kulturfestival Feiert Vielfalt",
        "Wirtschaftswachstum Übertrifft Erwartungen",
        "Wissenschaftlicher Durchbruch bei Erneuerbaren Energien",
        "Historisches Abkommen von Weltführern Unterzeichnet",
        "Bildungsreform-Initiative Vorgestellt",
        "Verkehrsinfrastruktur Modernisiert",
        "Umweltschutzmaßnahmen Erweitert",
        "Digitale Sicherheitsstandards Aktualisiert",
        "Gemeindeentwicklungsprojekt Erfolgreich"
      ]
    };
    
    const mockTitles = mockTitlesByLanguage[language] || mockTitlesByLanguage.en;

    // Filter locations based on language-appropriate regions (same as real API)
    const appropriateRegions = LANGUAGE_TO_REGIONS[language] || LANGUAGE_TO_REGIONS.en;
    const filteredLocations = WORLDWIDE_LOCATIONS.filter(loc => 
      appropriateRegions.includes(loc.region)
    );

    return filteredLocations.map((location, index) => {
      const randomOffset = 0.5;
      return {
        id: Date.now() + index,
        title: mockTitles[index] || mockTitles[0],
        summary: `Latest news from ${location.name}: ${mockTitles[index] || mockTitles[0]}`,
        content: `This is breaking news from ${location.name} in ${location.region}.`,
        category: "BREAKING",
        latitude: location.lat + (Math.random() - 0.5) * randomOffset,
        longitude: location.lng + (Math.random() - 0.5) * randomOffset,
        imageUrl: null,
        isBreaking: true,
        views: Math.floor(Math.random() * 500) + 50,
        publishedAt: new Date(),
        location: location.name,
        sourceUrl: "#",
        sourceName: `${location.name} News`,
        country: location.region,
        language,
        externalId: `mock-worldwide-${language}-${index}`,
        userId: null,
        isUserCreated: false,
      };
    });
  }

  async getTopHeadlinesByCountry(countryCode: string): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      return this.getMockHeadlines(countryCode);
    }

    const validCountries = ["in", "us", "gb"];
    if (!validCountries.includes(countryCode.toLowerCase())) {
      throw new Error(`Unsupported country code: ${countryCode}. Supported: in, us, gb`);
    }

    try {
      const url = `${this.baseUrl}?country=${countryCode}&pageSize=5&apiKey=${this.apiKey}`;
      console.log(`Fetching top headlines for ${countryCode.toUpperCase()}...`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`NewsAPI error: ${response.status}`, errorData);
        return this.getMockHeadlines(countryCode);
      }

      const data: NewsAPIResponse = await response.json();

      if (!data.articles || data.articles.length === 0) {
        console.warn(`No articles found for ${countryCode}`);
        return [];
      }

      const countryInfo = COUNTRY_COORDINATES[countryCode.toLowerCase()];

      return data.articles.slice(0, 5).map((article, index) => {
        const lat = countryInfo.lat + (Math.random() - 0.5) * 2;
        const lng = countryInfo.lng + (Math.random() - 0.5) * 2;

        return {
          id: Date.now() + index,
          title: article.title,
          summary: article.description || article.title,
          content: article.content || article.description || article.title,
          category: "BREAKING",
          latitude: lat,
          longitude: lng,
          imageUrl: article.urlToImage,
          isBreaking: true,
          views: Math.floor(Math.random() * 1000) + 100,
          publishedAt: new Date(article.publishedAt),
          location: countryInfo.name,
          sourceUrl: article.url,
          sourceName: article.source.name,
          country: countryCode,
          language: "en",
          externalId: `newsapi-${Date.now()}-${index}`,
          userId: null,
          isUserCreated: false,
        } as NewsArticle;
      });

    } catch (error) {
      console.error(`Error fetching NewsAPI headlines for ${countryCode}:`, error);
      return this.getMockHeadlines(countryCode);
    }
  }

  private getMockHeadlines(countryCode: string): NewsArticle[] {
    const countryInfo = COUNTRY_COORDINATES[countryCode.toLowerCase()];
    if (!countryInfo) return [];

    const mockTitles: Record<string, string[]> = {
      "in": [
        "India's Economy Shows Strong Growth in Q3",
        "Major Policy Announcement Expected This Week",
        "Tech Sector Sees Record Investment",
        "Infrastructure Development Plan Unveiled",
        "Sports Team Wins International Championship"
      ],
      "us": [
        "Federal Reserve Maintains Interest Rates",
        "Tech Giants Report Quarterly Earnings",
        "Major Infrastructure Bill Passes Senate",
        "New Climate Initiative Announced",
        "Championship Game Sets Viewership Records"
      ],
      "gb": [
        "Parliament Debates New Trade Agreements",
        "Royal Family Announces Public Engagements",
        "London Hosts International Summit",
        "NHS Funding Increase Confirmed",
        "Premier League Season Reaches Climax"
      ]
    };

    const titles = mockTitles[countryCode] || mockTitles["us"];

    return titles.map((title, index) => ({
      id: Date.now() + index,
      title,
      summary: `Top news from ${countryInfo.name}: ${title}`,
      content: `This is a sample article about ${title.toLowerCase()}.`,
      category: "BREAKING",
      latitude: countryInfo.lat + (Math.random() - 0.5) * 2,
      longitude: countryInfo.lng + (Math.random() - 0.5) * 2,
      imageUrl: null,
      isBreaking: true,
      views: Math.floor(Math.random() * 500) + 50,
      publishedAt: new Date(),
      location: countryInfo.name,
      sourceUrl: "#",
      sourceName: `${countryInfo.name} News`,
      country: countryCode,
      language: "en",
      externalId: `mock-${countryCode}-${index}`,
      userId: null,
      isUserCreated: false,
    }));
  }
}

export const newsAPIService = new NewsAPIService();
