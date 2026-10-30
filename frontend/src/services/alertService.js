import { getSupabaseClient } from "../config/supabase";

async function result(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export function listAlertRules(userId, company) {
  return result(
    getSupabaseClient()
      .from("alert_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("company", company)
      .order("created_at"),
  );
}

export function createAlertRule(userId, rule) {
  const { company, metric, operator, threshold, unit, enabled } = rule;
  return result(
    getSupabaseClient()
      .from("alert_rules")
      .insert({
        user_id: userId,
        company,
        metric,
        operator,
        threshold,
        unit,
        enabled,
      })
      .select()
      .single(),
  );
}

export function updateAlertRule(userId, id, changes) {
  const { metric, operator, threshold, unit, enabled } = changes;
  return result(
    getSupabaseClient()
      .from("alert_rules")
      .update({ metric, operator, threshold, unit, enabled })
      .eq("user_id", userId)
      .eq("id", id)
      .select()
      .single(),
  );
}

export function deleteAlertRule(userId, id) {
  return result(
    getSupabaseClient()
      .from("alert_rules")
      .delete()
      .eq("user_id", userId)
      .eq("id", id),
  );
}

export function insertAlertEvent(userId, event) {
  return result(
    getSupabaseClient()
      .from("alert_events")
      .upsert(
        { ...event, user_id: userId },
        {
          onConflict: "rule_id,company,reporting_year,observed_value",
          ignoreDuplicates: true,
        },
      )
      .select(),
  );
}

export function listAlertEvents(userId, company) {
  return result(
    getSupabaseClient()
      .from("alert_events")
      .select("*")
      .eq("user_id", userId)
      .eq("company", company)
      .order("triggered_at", { ascending: false }),
  );
}
