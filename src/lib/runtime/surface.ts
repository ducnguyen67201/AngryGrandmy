export type LocalSurface = "app" | "marketing";

export function resolveLocalSurface(value: string | undefined): LocalSurface {
  return value === "app" ? "app" : "marketing";
}
