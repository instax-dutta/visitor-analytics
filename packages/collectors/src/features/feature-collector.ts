import type { Collector, CollectorContext, FeatureData } from "@visitor-analytics-sdk/core";
import { safeCall, SDK_VERSION } from "@visitor-analytics-sdk/utils";

export class FeatureCollector implements Collector {
  readonly name = "features";
  readonly category = "features" as const;
  readonly version = SDK_VERSION;
  enabled = true;

  async collect(context: CollectorContext): Promise<{ features: FeatureData }> {
    const win = context.window;
    const nav = context.navigator;
    const doc = context.document;

    return {
      features: {
        webgl: this.checkWebGL(doc),
        webgl2: this.checkWebGL2(doc),
        webgpu: this.checkWebGPU(nav),
        wasm: this.checkWASM(),
        webrtc: this.checkWebRTC(win),
        websockets: this.checkWebSockets(win),
        broadcastChannel: this.checkBroadcastChannel(win),
        sharedWorker: this.checkSharedWorker(win),
        serviceWorker: this.checkServiceWorker(nav),
        notifications: this.checkNotifications(win),
        clipboard: this.checkClipboard(nav),
        fileSystemAccess: this.checkFileSystemAccess(win),
        webShare: this.checkWebShare(nav),
        webAuthn: this.checkWebAuthn(win),
        pushManager: this.checkPushManager(win),
        geolocation: this.checkGeolocation(nav),
        bluetooth: this.checkBluetooth(nav),
        usb: this.checkUSB(nav),
        serial: this.checkSerial(nav),
        gamepad: this.checkGamepad(win),
        pictureInPicture: this.checkPictureInPicture(win),
        fullscreen: this.checkFullscreen(doc),
      },
    };
  }

  private checkWebGL(doc: CollectorContext["document"]): boolean {
    return safeCall(() => {
      const canvas = doc.createElement("canvas") as unknown as { getContext: (id: string) => unknown };
      const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
      return gl !== null;
    }, false);
  }

  private checkWebGL2(doc: CollectorContext["document"]): boolean {
    return safeCall(() => {
      const canvas = doc.createElement("canvas") as unknown as { getContext: (id: string) => unknown };
      const gl = canvas.getContext("webgl2");
      return gl !== null;
    }, false);
  }

  private checkWebGPU(nav: CollectorContext["navigator"]): boolean {
    return safeCall(() => {
      const gpu = (nav as unknown as { gpu?: { requestAdapter?: unknown } }).gpu;
      return typeof gpu === "object" && typeof gpu?.requestAdapter === "function";
    }, false);
  }

  private checkWASM(): boolean {
    return safeCall(() => {
      return typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
    }, false);
  }

  private checkWebRTC(win: CollectorContext["window"]): boolean {
    return safeCall(() => {
      return typeof (win as unknown as { RTCPeerConnection?: unknown }).RTCPeerConnection !== "undefined";
    }, false);
  }

  private checkWebSockets(win: CollectorContext["window"]): boolean {
    return typeof (win as unknown as { WebSocket?: unknown }).WebSocket !== "undefined";
  }

  private checkBroadcastChannel(win: CollectorContext["window"]): boolean {
    return typeof (win as unknown as { BroadcastChannel?: unknown }).BroadcastChannel !== "undefined";
  }

  private checkSharedWorker(win: CollectorContext["window"]): boolean {
    return typeof (win as unknown as { SharedWorker?: unknown }).SharedWorker !== "undefined";
  }

  private checkServiceWorker(nav: CollectorContext["navigator"]): boolean {
    return typeof nav !== "undefined" && "serviceWorker" in nav;
  }

  private checkNotifications(win: CollectorContext["window"]): boolean {
    return safeCall(() => {
      const w = win as unknown as { Notification?: { permission?: string } };
      return typeof w.Notification === "object" && typeof w.Notification.permission === "string";
    }, false);
  }

  private checkClipboard(nav: CollectorContext["navigator"]): boolean {
    return safeCall(() => {
      const clipboard = (nav as unknown as { clipboard?: { readText?: unknown } }).clipboard;
      return typeof clipboard?.readText === "function";
    }, false);
  }

  private checkFileSystemAccess(win: CollectorContext["window"]): boolean {
    return typeof (win as unknown as { showOpenFilePicker?: unknown }).showOpenFilePicker === "function";
  }

  private checkWebShare(nav: CollectorContext["navigator"]): boolean {
    return safeCall(() => {
      return typeof (nav as unknown as { share?: unknown }).share === "function";
    }, false);
  }

  private checkWebAuthn(win: CollectorContext["window"]): boolean {
    return safeCall(() => {
      return typeof (win as unknown as { PublicKeyCredential?: unknown }).PublicKeyCredential !== "undefined";
    }, false);
  }

  private checkPushManager(win: CollectorContext["window"]): boolean {
    return safeCall(() => {
      return typeof (win as unknown as { PushManager?: unknown }).PushManager !== "undefined";
    }, false);
  }

  private checkGeolocation(nav: CollectorContext["navigator"]): boolean {
    return safeCall(() => {
      return "geolocation" in nav;
    }, false);
  }

  private checkBluetooth(nav: CollectorContext["navigator"]): boolean {
    return safeCall(() => {
      return "bluetooth" in nav;
    }, false);
  }

  private checkUSB(nav: CollectorContext["navigator"]): boolean {
    return safeCall(() => {
      return "usb" in nav;
    }, false);
  }

  private checkSerial(nav: CollectorContext["navigator"]): boolean {
    return safeCall(() => {
      return "serial" in nav;
    }, false);
  }

  private checkGamepad(win: CollectorContext["window"]): boolean {
    return safeCall(() => {
      return typeof (win as unknown as { navigator?: { getGamepads?: unknown } }).navigator?.getGamepads === "function";
    }, false);
  }

  private checkPictureInPicture(win: CollectorContext["window"]): boolean {
    return safeCall(() => {
      const Video = (win as unknown as { HTMLVideoElement?: { prototype?: { requestPictureInPicture?: unknown } } }).HTMLVideoElement;
      return typeof Video?.prototype?.requestPictureInPicture === "function";
    }, false);
  }

  private checkFullscreen(doc: CollectorContext["document"]): boolean {
    return safeCall(() => {
      const el = doc as unknown as { documentElement?: { requestFullscreen?: unknown } };
      return typeof el.documentElement?.requestFullscreen === "function";
    }, false);
  }

  async destroy(): Promise<void> {
    // no-op
  }
}
