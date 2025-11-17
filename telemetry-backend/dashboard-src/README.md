# Analytics Dashboard Source Code

This folder contains the analytics dashboard source code that should be integrated into the main dashboard application.

## Files Structure

```
dashboard-src/
├── src/
│   ├── pages/              # Analytics dashboard pages
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── EngagementAnalytics.tsx
│   │   ├── UserAnalytics.tsx
│   │   ├── FeatureAdoption.tsx
│   │   ├── RetentionGrowth.tsx
│   │   └── InfrastructureInsights.tsx
│   ├── components/         # Modified components
│   │   └── Header.tsx      # Header with analytics menu
│   ├── services/           # API client
│   │   └── analytics-api.ts
│   └── types/              # TypeScript types
│       └── analytics.ts
└── README.md
```

## Integration Instructions

To integrate these files into the main dashboard:

1. **Copy pages** to `dashboard/src/pages/`
2. **Update Header component** in `dashboard/src/components/Header.tsx` with analytics menu
3. **Add routes** to `dashboard/src/App.tsx`:
   ```tsx
   import AnalyticsDashboard from './pages/AnalyticsDashboard'
   // ... other imports
   
   <Route path="/analytics" element={<AnalyticsDashboard />} />
   <Route path="/analytics/engagement" element={<EngagementAnalytics />} />
   // ... other routes
   ```
4. **Add types** to `dashboard/src/types/index.ts` (or import from analytics.ts)
5. **Add API methods** to `dashboard/src/services/api.ts` (or use analytics-api.ts)

## API Endpoints

These pages connect to the analytics API endpoints in `telemetry-backend/api/analytics/`:
- `/api/analytics/timeseries`
- `/api/analytics/engagement`
- `/api/analytics/users`
- `/api/analytics/features`
- `/api/analytics/retention`
- `/api/analytics/infrastructure`

