declare module "threejs-toys" {
  export function neonCursor(params: {
    el?: HTMLElement;
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    resize?: boolean | "window";
    [key: string]: unknown;
  }): { config: Record<string, unknown> };
}
