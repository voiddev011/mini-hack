import { getSupabaseClient } from '../config/supabase';

export async function listActivities() {
  const { data, error } = await getSupabaseClient()
    .from('activities')
    .select('id, category, activity_name, amount, unit, co2_emission, activity_date, created_at')
    .order('activity_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createActivity(activity) {
  const { data, error } = await getSupabaseClient()
    .from('activities')
    .insert(activity)
    .select('id, category, activity_name, amount, unit, co2_emission, activity_date, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateActivity(activityId, changes) {
  const { data, error } = await getSupabaseClient()
    .from('activities')
    .update(changes)
    .eq('id', activityId)
    .select('id, category, activity_name, amount, unit, co2_emission, activity_date, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteActivity(activityId) {
  const { error } = await getSupabaseClient()
    .from('activities')
    .delete()
    .eq('id', activityId)
    .select('id')
    .single();

  if (error) throw error;
}
