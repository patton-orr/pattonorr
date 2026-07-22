import { getSql } from "@/lib/db";
import { getValidAccessToken, isConnected } from "@/lib/whoop-store";
import {
  fetchCycles,
  fetchRecoveries,
  fetchSleeps,
  fetchWorkouts,
} from "@/lib/whoop";

// Pull WHOOP history into Postgres. Idempotent upserts, so re-running is safe
// and catches records that were re-scored (PENDING_SCORE -> SCORED).

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000; // overlap window to catch updates

// Postgres caps a statement at 65535 bind parameters (Int16). Chunk each bulk
// upsert so a large first-run backfill can't blow that ceiling.
async function batchUpsert<T>(
  rows: T[],
  fieldsPerRow: number,
  run: (batch: T[]) => Promise<unknown>,
) {
  const size = Math.max(1, Math.floor(60000 / fieldsPerRow));
  for (let i = 0; i < rows.length; i += size) {
    await run(rows.slice(i, i + size));
  }
}

async function lastSynced(
  sql: ReturnType<typeof getSql>,
  resource: string,
): Promise<string | undefined> {
  const rows = await sql`
    SELECT last_synced FROM whoop_sync_state WHERE resource = ${resource}`;
  const ts = rows[0]?.last_synced as Date | null | undefined;
  if (!ts) return undefined; // first run: full backfill
  return new Date(ts.getTime() - LOOKBACK_MS).toISOString();
}

async function markSynced(
  sql: ReturnType<typeof getSql>,
  resource: string,
) {
  await sql`
    INSERT INTO whoop_sync_state (resource, last_synced, updated_at)
    VALUES (${resource}, now(), now())
    ON CONFLICT (resource) DO UPDATE SET last_synced = now(), updated_at = now()`;
}

export type SyncResult = {
  cycles: number;
  recoveries: number;
  sleeps: number;
  workouts: number;
};

export async function runSync(): Promise<SyncResult> {
  const token = await getValidAccessToken();
  if (!token) {
    // A token row can exist yet be unusable (the rotating refresh token has
    // expired or was revoked). Tell the two states apart so the UI can offer
    // the right fix — reconnect vs. first-time connect.
    const connected = await isConnected();
    throw new Error(
      connected
        ? "WHOOP authorization expired — reconnect your account."
        : "WHOOP not connected.",
    );
  }
  const sql = getSql();

  // --- Cycles ---
  const cycleStart = await lastSynced(sql, "cycle");
  const cycles = await fetchCycles(token, { start: cycleStart });
  if (cycles.length) {
    const rows = cycles.map((c) => ({
      id: c.id,
      start: c.start,
      end: c.end ?? null,
      timezone_offset: c.timezone_offset ?? null,
      score_state: c.score_state ?? null,
      strain: c.score?.strain ?? null,
      kilojoule: c.score?.kilojoule ?? null,
      average_heart_rate: c.score?.average_heart_rate ?? null,
      max_heart_rate: c.score?.max_heart_rate ?? null,
      created_at: c.created_at ?? null,
      updated_at: c.updated_at ?? null,
    }));
    await batchUpsert(rows, 11, (b) => sql`
      INSERT INTO whoop_cycle ${sql(b)}
      ON CONFLICT (id) DO UPDATE SET
        start = excluded.start,
        "end" = excluded."end",
        timezone_offset = excluded.timezone_offset,
        score_state = excluded.score_state,
        strain = excluded.strain,
        kilojoule = excluded.kilojoule,
        average_heart_rate = excluded.average_heart_rate,
        max_heart_rate = excluded.max_heart_rate,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at`);
  }
  await markSynced(sql, "cycle");

  // --- Recoveries ---
  const recoveryStart = await lastSynced(sql, "recovery");
  const recoveries = await fetchRecoveries(token, { start: recoveryStart });
  if (recoveries.length) {
    const rows = recoveries.map((r) => ({
      cycle_id: r.cycle_id,
      sleep_id: r.sleep_id ?? null,
      score_state: r.score_state ?? null,
      recovery_score: r.score?.recovery_score ?? null,
      resting_heart_rate: r.score?.resting_heart_rate ?? null,
      hrv_rmssd_milli: r.score?.hrv_rmssd_milli ?? null,
      spo2_percentage: r.score?.spo2_percentage ?? null,
      skin_temp_celsius: r.score?.skin_temp_celsius ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
    }));
    await batchUpsert(rows, 10, (b) => sql`
      INSERT INTO whoop_recovery ${sql(b)}
      ON CONFLICT (cycle_id) DO UPDATE SET
        sleep_id = excluded.sleep_id,
        score_state = excluded.score_state,
        recovery_score = excluded.recovery_score,
        resting_heart_rate = excluded.resting_heart_rate,
        hrv_rmssd_milli = excluded.hrv_rmssd_milli,
        spo2_percentage = excluded.spo2_percentage,
        skin_temp_celsius = excluded.skin_temp_celsius,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at`);
  }
  await markSynced(sql, "recovery");

  // --- Sleeps ---
  const sleepStart = await lastSynced(sql, "sleep");
  const sleeps = await fetchSleeps(token, { start: sleepStart });
  if (sleeps.length) {
    const rows = sleeps.map((s) => ({
      id: s.id,
      cycle_id: s.cycle_id ?? null,
      start: s.start,
      end: s.end ?? null,
      timezone_offset: s.timezone_offset ?? null,
      nap: s.nap ?? null,
      score_state: s.score_state ?? null,
      respiratory_rate: s.score?.respiratory_rate ?? null,
      sleep_performance_percentage:
        s.score?.sleep_performance_percentage ?? null,
      sleep_consistency_percentage:
        s.score?.sleep_consistency_percentage ?? null,
      sleep_efficiency_percentage:
        s.score?.sleep_efficiency_percentage ?? null,
      total_in_bed_time_milli:
        s.score?.stage_summary?.total_in_bed_time_milli ?? null,
      total_awake_time_milli:
        s.score?.stage_summary?.total_awake_time_milli ?? null,
      total_light_sleep_time_milli:
        s.score?.stage_summary?.total_light_sleep_time_milli ?? null,
      total_slow_wave_sleep_time_milli:
        s.score?.stage_summary?.total_slow_wave_sleep_time_milli ?? null,
      total_rem_sleep_time_milli:
        s.score?.stage_summary?.total_rem_sleep_time_milli ?? null,
      sleep_cycle_count: s.score?.stage_summary?.sleep_cycle_count ?? null,
      disturbance_count: s.score?.stage_summary?.disturbance_count ?? null,
      created_at: s.created_at ?? null,
      updated_at: s.updated_at ?? null,
    }));
    await batchUpsert(rows, 20, (b) => sql`
      INSERT INTO whoop_sleep ${sql(b)}
      ON CONFLICT (id) DO UPDATE SET
        cycle_id = excluded.cycle_id,
        start = excluded.start,
        "end" = excluded."end",
        timezone_offset = excluded.timezone_offset,
        nap = excluded.nap,
        score_state = excluded.score_state,
        respiratory_rate = excluded.respiratory_rate,
        sleep_performance_percentage = excluded.sleep_performance_percentage,
        sleep_consistency_percentage = excluded.sleep_consistency_percentage,
        sleep_efficiency_percentage = excluded.sleep_efficiency_percentage,
        total_in_bed_time_milli = excluded.total_in_bed_time_milli,
        total_awake_time_milli = excluded.total_awake_time_milli,
        total_light_sleep_time_milli = excluded.total_light_sleep_time_milli,
        total_slow_wave_sleep_time_milli = excluded.total_slow_wave_sleep_time_milli,
        total_rem_sleep_time_milli = excluded.total_rem_sleep_time_milli,
        sleep_cycle_count = excluded.sleep_cycle_count,
        disturbance_count = excluded.disturbance_count,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at`);
  }
  await markSynced(sql, "sleep");

  // --- Workouts ---
  const workoutStart = await lastSynced(sql, "workout");
  const workouts = await fetchWorkouts(token, { start: workoutStart });
  if (workouts.length) {
    const rows = workouts.map((w) => ({
      id: w.id,
      start: w.start,
      end: w.end ?? null,
      timezone_offset: w.timezone_offset ?? null,
      sport_name: w.sport_name ?? null,
      score_state: w.score_state ?? null,
      strain: w.score?.strain ?? null,
      average_heart_rate: w.score?.average_heart_rate ?? null,
      max_heart_rate: w.score?.max_heart_rate ?? null,
      kilojoule: w.score?.kilojoule ?? null,
      percent_recorded: w.score?.percent_recorded ?? null,
      distance_meter: w.score?.distance_meter ?? null,
      altitude_gain_meter: w.score?.altitude_gain_meter ?? null,
      altitude_change_meter: w.score?.altitude_change_meter ?? null,
      zone_zero_milli: w.score?.zone_durations?.zone_zero_milli ?? null,
      zone_one_milli: w.score?.zone_durations?.zone_one_milli ?? null,
      zone_two_milli: w.score?.zone_durations?.zone_two_milli ?? null,
      zone_three_milli: w.score?.zone_durations?.zone_three_milli ?? null,
      zone_four_milli: w.score?.zone_durations?.zone_four_milli ?? null,
      zone_five_milli: w.score?.zone_durations?.zone_five_milli ?? null,
      created_at: w.created_at ?? null,
      updated_at: w.updated_at ?? null,
    }));
    await batchUpsert(rows, 22, (b) => sql`
      INSERT INTO whoop_workout ${sql(b)}
      ON CONFLICT (id) DO UPDATE SET
        start = excluded.start,
        "end" = excluded."end",
        timezone_offset = excluded.timezone_offset,
        sport_name = excluded.sport_name,
        score_state = excluded.score_state,
        strain = excluded.strain,
        average_heart_rate = excluded.average_heart_rate,
        max_heart_rate = excluded.max_heart_rate,
        kilojoule = excluded.kilojoule,
        percent_recorded = excluded.percent_recorded,
        distance_meter = excluded.distance_meter,
        altitude_gain_meter = excluded.altitude_gain_meter,
        altitude_change_meter = excluded.altitude_change_meter,
        zone_zero_milli = excluded.zone_zero_milli,
        zone_one_milli = excluded.zone_one_milli,
        zone_two_milli = excluded.zone_two_milli,
        zone_three_milli = excluded.zone_three_milli,
        zone_four_milli = excluded.zone_four_milli,
        zone_five_milli = excluded.zone_five_milli,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at`);
  }
  await markSynced(sql, "workout");

  return {
    cycles: cycles.length,
    recoveries: recoveries.length,
    sleeps: sleeps.length,
    workouts: workouts.length,
  };
}
