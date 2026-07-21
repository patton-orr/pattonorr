import { getWeather, describeWeather } from "@/lib/weather";

export async function WeatherCard() {
  const w = await getWeather();

  if (!w) {
    return (
      <div className="rounded-2xl border border-[color:var(--faith-card-border)] bg-[var(--faith-card)] p-6">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Weather
        </span>
        <p className="mt-2 text-sm text-zinc-500">
          Couldn’t load the weather right now.
        </p>
      </div>
    );
  }

  const { label, emoji } = describeWeather(w.code, w.isDay);

  return (
    <div className="rounded-2xl border border-[color:var(--faith-card-border)] bg-[var(--faith-card)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Weather · {w.city}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums text-black dark:text-zinc-50">
              {w.tempF}°
            </span>
            <span className="text-sm text-zinc-500">Feels {w.feelsF}°</span>
          </div>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
        </div>
        <span className="text-5xl leading-none" aria-hidden>
          {emoji}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-black/[.06] pt-3 dark:border-white/[.1]">
        <Detail label="Hi / Lo" value={`${w.hiF}° / ${w.loF}°`} />
        <Detail label="Humidity" value={`${w.humidity}%`} />
        <Detail label="Wind" value={`${w.windMph} mph`} />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums text-black dark:text-zinc-50">
        {value}
      </span>
    </div>
  );
}
