# @visitor-analytics-sdk/plugins

Plugin manager for the visitor-analytics SDK — install/uninstall lifecycle, collector registration, and event bus integration.

```bash
npm install @visitor-analytics-sdk/plugins
```

## Usage

```ts
import { PluginManager } from "@visitor-analytics-sdk/plugins";
import { EventBus } from "@visitor-analytics-sdk/utils";

const eventBus = new EventBus();
const pluginManager = new PluginManager(eventBus);
```

## Writing a plugin

```ts
import type { Plugin, PluginContext } from "@visitor-analytics-sdk/core";

class MyPlugin implements Plugin {
  readonly name = "my-plugin";
  readonly version = "1.0.0";
  readonly description = "Adds custom data to analytics";

  install(ctx: PluginContext): void {
    ctx.addCollector({
      name: "my-collector",
      category: "custom",
      version: "1.0.0",
      enabled: true,
      collect: async () => ({ /* custom data */ }),
    });
  }

  uninstall(ctx: PluginContext): void {
    ctx.removeCollector("my-collector");
  }
}
```

## License

MIT
