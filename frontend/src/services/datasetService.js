import { getSupabaseClient } from "../config/supabase";

export const DATASET_BUCKET = "trustcarbon-datasets";

export function parseDatasetMetadata(description) {
  if (!description) return {};
  try {
    const parsed = JSON.parse(description);
    return parsed?.version === 1 ? parsed.metadata || {} : { description };
  } catch {
    return { description };
  }
}

export async function listMyDatasets() {
  const { data, error } = await getSupabaseClient()
    .from("datasets")
    .select(
      "id, file_name, file_url, dataset_type, description, source, status, admin_comment, reviewed_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function uploadDataset({
  userId,
  file,
  datasetName,
  datasetType,
  description,
  source,
  sourceUrl,
  yearRange,
  methodologyNotes,
  validationWarnings,
}) {
  if (!file || !file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Choose a CSV file to upload.");
  }

  const client = getSupabaseClient();
  const extension = file.name.split(".").pop().toLowerCase();
  const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from(DATASET_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type || "text/csv",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await client
    .from("datasets")
    .insert({
      uploaded_by: userId,
      file_name: `${datasetName.trim().replace(/\.csv$/i, "")}.csv`,
      file_url: objectPath,
      dataset_type: datasetType,
      description: JSON.stringify({
        version: 1,
        metadata: {
          description,
          sourceUrl,
          yearRange,
          methodologyNotes,
          validationWarnings,
        },
      }),
      source,
      status: "pending",
    })
    .select(
      "id, file_name, file_url, dataset_type, description, source, status, admin_comment, reviewed_at, created_at",
    )
    .single();

  if (insertError) {
    const { error: cleanupError } = await client.storage
      .from(DATASET_BUCKET)
      .remove([objectPath]);
    if (cleanupError) {
      throw new AggregateError(
        [insertError, cleanupError],
        "Dataset record creation failed and the uploaded file could not be removed.",
      );
    }
    throw insertError;
  }

  return data;
}

export async function createDatasetDownloadUrl(objectPath) {
  const { data, error } = await getSupabaseClient()
    .storage.from(DATASET_BUCKET)
    .createSignedUrl(objectPath, 60);

  if (error) throw error;
  return data.signedUrl;
}
