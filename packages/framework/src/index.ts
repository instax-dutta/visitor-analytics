export {
  AnalyticsProvider,
  useAnalytics,
  useAnalyticsContext,
  useAnalyticsEvent,
  useCollectedData,
  useAnalyticsExport,
} from "./react/index";

export {
  createAnalyticsPlugin,
  useAnalytics as useVueAnalytics,
  useAnalyticsEvent as useVueAnalyticsEvent,
  useCollectedData as useVueCollectedData,
  AnalyticsKey,
} from "./vue/index";

export {
  createAnalyticsStore,
  analyticsAction,
} from "./svelte/index";

export {
  createAnalyticsHook,
  AnalyticsProvider as SolidAnalyticsProvider,
} from "./solid/index";

export {
  createAstroAnalytics,
  getAnalyticsScript,
} from "./astro/index";
