import { getSql } from "@/lib/db";
import { isConnected } from "@/lib/whoop-store";

// Read layer for the dashboard. Derived values are computed and cast to
// float8/int in SQL so postgres.js returns plain numbers (not numeric/bigint
// strings).

export type WhoopStatus = {
  connected: boolean;
  hasData: boolean;
  lastSync: string | null;
  counts: { cycles: number; recoveries: number; sleeps: number; workouts: number };
};

export async function getStatus(): Promise<WhoopStatus> {
  const connected = await isConnected();
  const sql = getSql();
  const [row] = await sql`
    SELECT
      (SELECT count(*)::int FROM whoop_cycle)    AS cycles,
      (SELECT count(*)::int FROM whoop_recovery) AS recoveries,
      (SELECT count(*)::int FROM whoop_sleep)    AS sleeps,
      (SELECT count(*)::int FROM whoop_workout)  AS workouts,
      (SELECT max(last_synced) FROM whoop_sync_state) AS last_sync`;
  const counts = {
    cycles: row.cycles ?? 0,
    recoveries: row.recoveries ?? 0,
    sleeps: row.sleeps ?? 0,
    workouts: row.workouts ?? 0,
  };
  return {
    connected,
    hasData: counts.recoveries > 0 || counts.cycles > 0,
    lastSync: row.last_sync ? (row.last_sync as Date).toISOString() : null,
    counts,
  };
}

export type Snapshot = {
  recovery:
    | { score: number; hrv: number; rhr: number; spo2: number | null; skinTemp: number | null; date: string }
    | null;
  sleep:
    | { hours: number; performance: number | null; efficiency: number | null; date: string }
    | null;
  strain: { strain: number; calories: number | null; date: string } | null;
};

export async function getSnapshot(): Promise<Snapshot> {
  const sql = getSql();
  const [rec] = await sql`
    SELECT r.recovery_score AS score, r.hrv_rmssd_milli AS hrv,
           r.resting_heart_rate AS rhr, r.spo2_percentage AS spo2,
           r.skin_temp_celsius AS skin_temp, to_char(c.start, 'YYYY-MM-DD') AS date
    FROM whoop_recovery r JOIN whoop_cycle c ON c.id = r.cycle_id
    WHERE r.score_state = 'SCORED'
    ORDER BY c.start DESC LIMIT 1`;
  const [slp] = await sql`
    SELECT ((total_in_bed_time_milli - total_awake_time_milli) / 3600000.0)::float8 AS hours,
           sleep_performance_percentage AS performance,
           sleep_efficiency_percentage AS efficiency,
           to_char(start, 'YYYY-MM-DD') AS date
    FROM whoop_sleep
    WHERE score_state = 'SCORED' AND nap = false
    ORDER BY start DESC LIMIT 1`;
  const [cyc] = await sql`
    SELECT strain, (kilojoule / 4.184)::float8 AS calories,
           to_char(start, 'YYYY-MM-DD') AS date
    FROM whoop_cycle
    WHERE score_state = 'SCORED'
    ORDER BY start DESC LIMIT 1`;
  return {
    recovery: rec
      ? { score: rec.score, hrv: rec.hrv, rhr: rec.rhr, spo2: rec.spo2, skinTemp: rec.skin_temp, date: rec.date }
      : null,
    sleep: slp
      ? { hours: slp.hours, performance: slp.performance, efficiency: slp.efficiency, date: slp.date }
      : null,
    strain: cyc ? { strain: cyc.strain, calories: cyc.calories, date: cyc.date } : null,
  };
}

export type RecoveryPoint = { date: string; recovery: number | null; hrv: number | null; rhr: number | null };

export async function getRecoveryTrend(days = 90): Promise<RecoveryPoint[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT to_char(c.start, 'YYYY-MM-DD') AS date,
           r.recovery_score AS recovery, r.hrv_rmssd_milli AS hrv,
           r.resting_heart_rate AS rhr
    FROM whoop_recovery r JOIN whoop_cycle c ON c.id = r.cycle_id
    WHERE r.score_state = 'SCORED' AND c.start >= now() - make_interval(days => ${days})
    ORDER BY c.start ASC`;
  return rows as unknown as RecoveryPoint[];
}

export type SleepPoint = {
  date: string;
  light: number; deep: number; rem: number; awake: number;
  performance: number | null;
};

export async function getSleepTrend(days = 30): Promise<SleepPoint[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT to_char(start, 'YYYY-MM-DD') AS date,
           (total_light_sleep_time_milli / 3600000.0)::float8 AS light,
           (total_slow_wave_sleep_time_milli / 3600000.0)::float8 AS deep,
           (total_rem_sleep_time_milli / 3600000.0)::float8 AS rem,
           (total_awake_time_milli / 3600000.0)::float8 AS awake,
           sleep_performance_percentage AS performance
    FROM whoop_sleep
    WHERE score_state = 'SCORED' AND nap = false
      AND start >= now() - make_interval(days => ${days})
    ORDER BY start ASC`;
  return rows as unknown as SleepPoint[];
}

export type StrainPoint = { date: string; strain: number | null };

export async function getStrainTrend(days = 30): Promise<StrainPoint[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT to_char(start, 'YYYY-MM-DD') AS date, strain
    FROM whoop_cycle
    WHERE score_state = 'SCORED' AND start >= now() - make_interval(days => ${days})
    ORDER BY start ASC`;
  return rows as unknown as StrainPoint[];
}

export type WorkoutRow = {
  date: string; sport: string | null; strain: number | null;
  avgHr: number | null; calories: number | null;
  distanceKm: number | null; minutes: number | null;
};

export async function getRecentWorkouts(limit = 10): Promise<WorkoutRow[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT to_char(start, 'YYYY-MM-DD') AS date, sport_name AS sport, strain,
           average_heart_rate AS "avgHr", (kilojoule / 4.184)::float8 AS calories,
           (distance_meter / 1000.0)::float8 AS "distanceKm",
           (extract(epoch FROM ("end" - start)) / 60.0)::float8 AS minutes
    FROM whoop_workout
    ORDER BY start DESC LIMIT ${limit}`;
  return rows as unknown as WorkoutRow[];
}

export type ZoneTotals = { z0: number; z1: number; z2: number; z3: number; z4: number; z5: number };

export async function getZoneTotals(days = 30): Promise<ZoneTotals> {
  const sql = getSql();
  const [row] = await sql`
    SELECT
      COALESCE(SUM(zone_zero_milli), 0)::float8  / 60000.0 AS z0,
      COALESCE(SUM(zone_one_milli), 0)::float8   / 60000.0 AS z1,
      COALESCE(SUM(zone_two_milli), 0)::float8   / 60000.0 AS z2,
      COALESCE(SUM(zone_three_milli), 0)::float8 / 60000.0 AS z3,
      COALESCE(SUM(zone_four_milli), 0)::float8  / 60000.0 AS z4,
      COALESCE(SUM(zone_five_milli), 0)::float8  / 60000.0 AS z5
    FROM whoop_workout
    WHERE start >= now() - make_interval(days => ${days})`;
  return { z0: row.z0, z1: row.z1, z2: row.z2, z3: row.z3, z4: row.z4, z5: row.z5 };
}
