# KNEW - Knowledge Nexus for Every Witness

A revolutionary news platform prototype for EIC grant demonstration, combining location-based news with AI-powered bias detection, media ownership transparency, and citizen witness reports.

## 🌟 Features

### Core Functionality
- **Interactive World Map**: Click anywhere to fetch location-based news from NewsAPI
- **Country Headlines**: Top 5 headlines from India (IN), United States (US), and United Kingdom (GB)
- **Real-time News**: Integration with NewsData.io for worldwide coverage

### Pro Features ($5 One-Time Payment)
- **AI Bias Detection**: HuggingFace-powered analysis with confidence scores
  - Automatic pre-tagging (LEFT/CENTER/RIGHT)
  - Manual bias tagging with AI suggestions
  - Neutral AI-generated summaries
  
- **Media Ownership Mapping**: Interactive ownership charts showing who controls the news
  - Chart.js pie charts with distinct colors (#FF4500, #0000FF, #FFD700, etc.)
  - Mock ownership data for major sources (CNN, BBC, Fox News, etc.)
  - Transparency on ownership percentages
  
- **Advanced Analytics**: Access to full bias analysis and ownership insights

### Community Features
- **Anonymous Witness Reports**: Citizen journalism with mock usernames (@Shadow1, @Witness42, etc.)
- **Event History**: Timeline archive of all news, tags, and witness reports
- **Dashboard**: TRL status tracking (current: TRL 4, target: TRL 7)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (provided by Replit)
- API keys (see Configuration section)

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

## 🔧 Configuration

Add the following secrets in your Replit Secrets panel (or `.env` file):

### Required for Full Functionality

#### NewsAPI (Country Headlines)
```
NEWS_API_KEY=your_newsapi_key_here
```
- Get your key at: https://newsapi.org/register
- Free tier: 100 requests/day
- Required for: Top headlines by country (IN, US, GB)

#### NewsData.io (Global News)
```
NEWSDATA_API_KEY=your_newsdata_key_here
```
- Get your key at: https://newsdata.io/register
- Already configured in this project
- Required for: Worldwide news coverage

#### HuggingFace (AI Bias Detection)
```
HUGGINGFACE_API_KEY=your_huggingface_token_here
```
- Get your token at: https://huggingface.co/settings/tokens
- Model: cardiffnlp/twitter-roberta-base-bias-detection
- Required for: AI bias analysis (Pro feature)

#### Stripe (Payment Processing)
```
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```
- Get test keys at: https://dashboard.stripe.com/apikeys
- Use test keys for development (start with `pk_test_` and `sk_test_`)
- Required for: Pro subscription checkout
- **Note**: App works in demo mode without Stripe keys (auto-unlocks Pro)

### Optional (Production)
```
STRIPE_WEBHOOK_SECRET=whsec_...
```
- For production Stripe webhook verification
- Get from: https://dashboard.stripe.com/webhooks

## 💰 Switching to Live Mode

### Stripe Live Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Toggle from "Test mode" to "Live mode"
3. Copy your live keys:
   - `VITE_STRIPE_PUBLIC_KEY` → starts with `pk_live_`
   - `STRIPE_SECRET_KEY` → starts with `sk_live_`
4. Update your Replit Secrets with live keys
5. Restart your application

### NewsAPI Production

1. Upgrade your NewsAPI plan at https://newsapi.org/pricing
2. Production tier: 1000 requests/day ($449/month for unlimited)
3. No code changes needed - just update the API key

## 🎨 Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- Chart.js for ownership visualization
- React Leaflet for interactive maps
- TanStack Query for state management
- Wouter for routing

### Backend
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Stripe for payments
- NewsAPI & NewsData.io integrations
- HuggingFace Inference API

## 📊 TRL Progress

- **Current TRL**: 4 (84% user satisfaction - mock)
- **Target TRL**: 7 (95% accuracy, 10 languages, 10k+ sources)

### Roadmap to TRL 7
1. Scale to 10+ languages
2. Expand to 10,000+ news sources
3. Achieve 95% bias detection accuracy
4. Implement real-time fact-checking
5. Add cross-platform mobile apps

## 🗺️ Deployment

### Replit (Recommended)
The app is optimized for Replit's free tier and includes:
- Automatic database provisioning
- Built-in secrets management
- One-click deployment

To publish:
1. Click "Publish" in Replit
2. Your app will be available at `https://your-repl-name.replit.app`

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔐 Security Notes

- Never commit API keys to version control
- Always use environment variables/secrets
- Test mode Stripe keys are safe for development
- Production keys should only be on secure servers

## 📱 Features Showcase

### Hover Animations
All interactive elements include smooth transitions:
- Cards scale on hover (1.05x)
- Buttons have gradient transitions
- Map markers animate on interaction

### Dark Theme
Pro view features a sleek black/dark design:
- Gradient backgrounds (`from-gray-900 to-black`)
- Premium glassmorphism effects
- High contrast for accessibility

## 🤝 Support

For issues or questions:
1. Check the console for error messages
2. Verify all API keys are correctly set
3. Ensure database migrations are up to date (`npm run db:push`)
4. Contact Replit support for platform-specific issues

## 📄 License

Built for EIC Grant demonstration. All rights reserved.

---

**KNEW** - Empowering every witness with knowledge and transparency.
