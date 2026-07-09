# @visitor-analytics-sdk/framework

Framework integration shims for the visitor-analytics SDK — React, Vue, Svelte, SolidJS, and Astro providers, hooks, and stores.

```bash
npm install @visitor-analytics-sdk/framework
```

## React

```tsx
import { AnalyticsProvider, useAnalytics } from "@visitor-analytics-sdk/framework/react";

function App() {
  return (
    <AnalyticsProvider config={{ endpoint: "/api/analytics" }}>
      <Dashboard />
    </AnalyticsProvider>
  );
}

function Dashboard() {
  const analytics = useAnalytics();
  return <button onClick={() => analytics.flush()}>Upload</button>;
}
```

## Vue

```ts
import { createAnalyticsPlugin } from "@visitor-analytics-sdk/framework/vue";
app.use(createAnalyticsPlugin({ endpoint: "/api/analytics" }));
```

## Svelte

```svelte
<script>
  import { createAnalyticsStore } from "@visitor-analytics-sdk/framework/svelte";
  const { analytics, data, flush } = createAnalyticsStore({ endpoint: "/api/analytics" });
</script>
```

## SolidJS

```tsx
import { AnalyticsProvider } from "@visitor-analytics-sdk/framework/solid";
```

## Astro

```astro
import { createAstroAnalytics } from "@visitor-analytics-sdk/framework/astro";
```

## License

MIT
