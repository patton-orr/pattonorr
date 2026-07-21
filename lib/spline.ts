// Cardinal (Catmull-Rom) spline through a run of points. k in [0,1]: 0 = a
// plain polyline, 1 = maximum corner rounding. The curve always passes through
// every original point, so day-to-day values stay individually identifiable.
export function smoothSegment(
  pts: { x: number; y: number }[],
  k: number,
): string {
  if (!pts.length) return "";
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)} `;
  if (pts.length < 3 || k <= 0.02) {
    for (let i = 1; i < pts.length; i++)
      d += `L${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)} `;
    return d;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * k;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * k;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * k;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * k;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)} `;
  }
  return d;
}
