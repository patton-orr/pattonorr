// WHOOP recovery zones: red 0–33, yellow 34–66, green 67–100.
// Color vars come from the validated status palette in charts.tsx VizStyles.
export const REC_ZONES = [
  { min: 67, max: 100, colorVar: "--rec-green" },
  { min: 34, max: 66, colorVar: "--rec-yellow" },
  { min: 0, max: 33, colorVar: "--rec-red" },
];
