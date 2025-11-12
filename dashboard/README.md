# GATI Dashboard

Modern React web dashboard for visualizing and analyzing AI agent traces collected by the GATI SDK.

## Overview

The dashboard provides a visual interface to:
- Browse all tracked agents and their runs
- View detailed execution timelines
- Analyze token usage and costs
- Explore event hierarchies and execution flows

## Features

- **Agent List** - View all agents with aggregated statistics
- **Run Browser** - Explore individual agent executions
- **Event Timeline** - Chronological view of events within each run
- **Metrics Display** - Token counts, costs, and durations
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Works on desktop and tablet

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - API client

## Setup

### Using Docker Compose (Recommended)

From the project root:

```bash
docker-compose up -d
```

Dashboard runs on http://localhost:3000

### Local Development

1. Install dependencies:
```bash
cd dashboard
npm install
```

2. Configure API endpoint:

Create `.env.local`:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

3. Start dev server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
dashboard/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── AgentCard.tsx
│   │   ├── RunDetail.tsx
│   │   └── Timeline.tsx
│   ├── pages/           # Page components
│   │   ├── AgentsList.tsx
│   │   └── AgentDetail.tsx
│   ├── services/
│   │   └── api.ts       # API client
│   ├── types/
│   │   └── index.ts     # TypeScript types
│   ├── styles/
│   │   └── globals.css  # Global styles
│   ├── App.tsx          # Root component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── index.html
└── package.json
```

## API Integration

The dashboard connects to the GATI Backend API:

- `GET /api/agents` - List all agents
- `GET /api/agents/{agent_name}` - Agent details
- `GET /api/agents/{agent_name}/runs` - Agent runs
- `GET /api/runs/{run_id}` - Run details
- `GET /api/runs/{run_id}/timeline` - Event timeline
- `GET /api/metrics/summary` - Global metrics

Configure the API URL in [src/services/api.ts](src/services/api.ts) or via environment variable.

## Styling

The dashboard uses Tailwind CSS with a custom theme:

- **Primary**: Navy Blue (#1e3a8a)
- **Font**: Garamond (headings), system sans-serif (body)
- **Dark Mode**: Full support with system preference detection

Customize in [tailwind.config.js](tailwind.config.js).

## Development

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

## Deployment

### Docker
```bash
docker build -t gati-dashboard .
docker run -p 3000:3000 gati-dashboard
```

### Static Hosting

Build and deploy the `dist/` folder to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest
- Mobile: iOS Safari 14+, Chrome Android

## License

MIT
