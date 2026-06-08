type ColourStop = readonly [number, readonly [number, number, number]];

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const toHex = (channel: number): string => {
  const value = Math.round(Math.min(255, Math.max(0, channel)));
  return value.toString(16).padStart(2, "0");
};

const interpolate = (
  value: number,
  stops: readonly ColourStop[],
): string => {
  const t = clamp01(value);
  let left = stops[0];
  let right = stops.at(-1);

  if (left === undefined || right === undefined) return "#000000";

  for (let index = 1; index < stops.length; index += 1) {
    const candidate = stops[index];
    if (candidate === undefined) continue;
    if (t <= candidate[0]) {
      right = candidate;
      left = stops[index - 1] ?? candidate;
      break;
    }
  }

  const span = right[0] - left[0];
  const local = span === 0 ? 0 : (t - left[0]) / span;
  const rgb = left[1].map((channel, index) => {
    const target = right[1][index] ?? channel;
    return channel + (target - channel) * local;
  });

  return `#${toHex(rgb[0] ?? 0)}${toHex(rgb[1] ?? 0)}${toHex(rgb[2] ?? 0)}`;
};

const viridis: readonly ColourStop[] = [
  [0, [68, 1, 84]],
  [0.25, [59, 82, 139]],
  [0.5, [33, 145, 140]],
  [0.75, [94, 201, 98]],
  [1, [253, 231, 37]],
];

const plasma: readonly ColourStop[] = [
  [0, [13, 8, 135]],
  [0.25, [126, 3, 168]],
  [0.5, [203, 71, 119]],
  [0.75, [248, 149, 64]],
  [1, [240, 249, 33]],
];

export const colourMapViridis = (value: number): string => interpolate(value, viridis);

export const colourMapPlasma = (value: number): string => interpolate(value, plasma);
