# Blayz Frontend

[Add project description here]

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file in the frontend directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
REQUESTY_API_KEY=your-requesty-api-key
```

## Requesty API Integration

The project now integrates with Requesty API to use Google's Gemini 2.5 Pro model for AI-powered campaign analysis. This implementation provides more advanced analysis capabilities for ad campaigns.

### Key Files Updated:

1. `pages/api/ai-campaign-analysis.js` - Main API for generating AI insights
2. `pages/api/generate-campaign-report.js` - Comprehensive report generation
3. `pages/api/test-gemini.js` - Test endpoint for Requesty API

### Testing the Requesty Integration

You can test the Requesty API integration by:

1. Updating your `.env.local` file with your Requesty API key
2. Starting the development server with `npm run dev`
3. Navigating to http://localhost:3000/debug/requesty-test in your browser
4. Entering a test prompt and submitting to see the response

### API Configuration

The implementation uses the following configurations:

- Base URL: `https://router.requesty.ai/v1`
- Endpoint: `/chat/completions`
- Model: `google/gemini-2.5-pro-exp-03-25`

### Benefits of Gemini 2.5 Pro

- Better handling of complex instructions and data
- Improved synthesis of insights
- More detailed and actionable recommendations
- Enhanced understanding of campaign metrics and contexts 