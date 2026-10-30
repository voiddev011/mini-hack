import { getSupabaseClient } from '../config/supabase';

export async function listDatasetsForReview() {
  const client = getSupabaseClient();
  const [{ data: datasets, error: datasetsError }, { data: profiles, error: profilesError }] = await Promise.all([
    client.from('datasets')
      .select('id, uploaded_by, file_name, file_url, dataset_type, description, source, status, admin_comment, reviewed_by, reviewed_at, created_at')
      .order('created_at', { ascending: false }),
    client.from('profiles').select('id, email'),
  ]);
  if (datasetsError) throw datasetsError;
  if (profilesError) throw profilesError;
  const emailsById = new Map(profiles.map((profile) => [profile.id, profile.email]));
  return datasets.map((dataset) => ({
    ...dataset,
    uploader_email: emailsById.get(dataset.uploaded_by) || 'Account email unavailable',
  }));
}

export async function reviewDataset({ datasetId, reviewerId, decision, comment }) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Choose an approval or rejection decision.');
  }
  if (decision === 'rejected' && !comment?.trim()) {
    throw new Error('Add a reason before rejecting this dataset.');
  }

  const { data, error } = await getSupabaseClient()
    .from('datasets')
    .update({
      status: decision,
      admin_comment: decision === 'rejected' ? comment.trim() : null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', datasetId)
    .eq('status', 'pending')
    .select('id, status, admin_comment, reviewed_by, reviewed_at')
    .single();

  if (error) throw error;
  return data;
}
