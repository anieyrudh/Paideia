import { z } from "zod";

export const ContainerEmbedStateSchema = z
  .object({
    predictionCommitted: z.boolean(),
  })
  .strict();

export const ContainerEmbedThemeSchema = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

export const ContainerEmbedScoreSchema = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

export type ContainerEmbedState = z.infer<typeof ContainerEmbedStateSchema>;
export type ContainerEmbedTheme = z.infer<typeof ContainerEmbedThemeSchema>;
export type ContainerEmbedScore = z.infer<typeof ContainerEmbedScoreSchema>;

export interface ContainerEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ContainerEmbedState;
  score(): ContainerEmbedScore;
  resume(state: ContainerEmbedState): void;
  syncTheme(theme: ContainerEmbedTheme): void;
  destroy(): void;
}
