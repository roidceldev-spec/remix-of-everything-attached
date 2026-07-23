import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import {
  createProgressBatchId,
  type ProcessedProgressPicture,
  progressPictureStoragePath,
} from "./progress-picture-processing";
import type { ProgressPicture, ProgressPictureBatch } from "./progress-pictures";
import { sortProgressPictureBatches } from "./progress-pictures";

export const PROGRESS_PICTURES_BUCKET = "progress-pictures";
const SIGNED_URL_SECONDS = 60 * 60;

type BatchRow = Tables<"progress_picture_batches">;
type PictureRow = Tables<"progress_pictures">;

export async function fetchProgressPictureBatches(
  clientId: string,
): Promise<ProgressPictureBatch[]> {
  const { data: batchRows, error: batchError } = await supabase
    .from("progress_picture_batches")
    .select("*")
    .eq("client_id", clientId)
    .order("capture_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (batchError) throw batchError;
  if (!batchRows || batchRows.length === 0) return [];

  const batchIds = batchRows.map((batch) => batch.id);
  const { data: pictureRows, error: pictureError } = await supabase
    .from("progress_pictures")
    .select("*")
    .in("batch_id", batchIds)
    .order("display_order", { ascending: true });
  if (pictureError) throw pictureError;

  const pictures = pictureRows ?? [];
  const paths = pictures.map((picture) => picture.storage_path);
  const signedUrls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signedRows, error: signedError } = await supabase.storage
      .from(PROGRESS_PICTURES_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (signedError) throw signedError;
    paths.forEach((path, index) => {
      const signedUrl = signedRows?.[index]?.signedUrl;
      if (signedUrl) signedUrls.set(path, signedUrl);
    });
  }

  const picturesByBatch = new Map<string, ProgressPicture[]>();
  for (const row of pictures) {
    const picture = mapPicture(row, signedUrls.get(row.storage_path) ?? "");
    const existing = picturesByBatch.get(row.batch_id);
    if (existing) existing.push(picture);
    else picturesByBatch.set(row.batch_id, [picture]);
  }

  return sortProgressPictureBatches(
    batchRows.map((batch) => mapBatch(batch, picturesByBatch.get(batch.id) ?? [])),
  );
}

export async function uploadProgressPictureBatch({
  clientId,
  captureDate,
  timezone,
  pictures,
  existingBatch,
  onProgress,
}: {
  clientId: string;
  captureDate: string;
  timezone: string;
  pictures: ProcessedProgressPicture[];
  existingBatch?: ProgressPictureBatch;
  onProgress?: (uploaded: number, total: number) => void;
}): Promise<string> {
  const existingCount = existingBatch?.pictures.length ?? 0;
  if (pictures.length < 1 || existingCount + pictures.length > 6) {
    throw new Error(`Select between 1 and ${Math.max(0, 6 - existingCount)} progress pictures.`);
  }
  if (existingBatch && existingBatch.clientId !== clientId) {
    throw new Error("The selected batch does not belong to this Client.");
  }
  if (existingBatch && existingBatch.captureDate !== captureDate) {
    throw new Error("The selected date does not match this progress-picture batch.");
  }

  const batchId = existingBatch?.id ?? createProgressBatchId();
  const uploadedPaths: string[] = [];
  try {
    for (let index = 0; index < pictures.length; index += 1) {
      const picture = pictures[index];
      const storagePath = progressPictureStoragePath({
        clientId,
        batchId,
        pictureId: picture.id,
      });
      uploadedPaths.push(storagePath);
      await uploadProgressPictureObject({ clientId, batchId, picture, storagePath });
      onProgress?.(index + 1, pictures.length);
    }

    const pictureMetadata = pictures.map((picture, index) => ({
      id: picture.id,
      storage_path: progressPictureStoragePath({ clientId, batchId, pictureId: picture.id }),
      width: picture.width,
      height: picture.height,
      byte_size: picture.byteSize,
      display_order: existingCount + index,
    }));

    const error = existingBatch
      ? (
          await supabase.rpc("append_progress_pictures_to_batch", {
            p_batch_id: batchId,
            p_client_id: clientId,
            p_pictures: pictureMetadata as unknown as Json,
          })
        ).error
      : (
          await supabase.rpc("create_progress_picture_batch", {
            p_batch_id: batchId,
            p_client_id: clientId,
            p_capture_date: captureDate,
            p_timezone: timezone,
            p_pictures: pictureMetadata as unknown as Json,
            p_preview_picture_id: pictures[randomIndex(pictures.length)].id,
          })
        ).error;

    if (error) {
      const pictureIds = pictures.map((picture) => picture.id);
      const { data: committedPictures } = await supabase
        .from("progress_pictures")
        .select("id")
        .eq("batch_id", batchId)
        .in("id", pictureIds);
      if (committedPictures?.length === pictures.length) return batchId;
      throw error;
    }
    return batchId;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      try {
        await cleanupProgressPictureObjects({ clientId, paths: uploadedPaths });
      } catch (cleanupError) {
        console.error("Failed to clean up progress-picture uploads", cleanupError);
      }
    }
    throw error;
  }
}

export async function setProgressPicturePreview({
  clientId,
  batchId,
  pictureId,
}: {
  clientId: string;
  batchId: string;
  pictureId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("set_progress_picture_preview", {
    p_client_id: clientId,
    p_batch_id: batchId,
    p_picture_id: pictureId,
  });
  if (error) throw error;
}

async function uploadProgressPictureObject({
  clientId,
  batchId,
  picture,
  storagePath,
}: {
  clientId: string;
  batchId: string;
  picture: ProcessedProgressPicture;
  storagePath: string;
}): Promise<void> {
  const body = new FormData();
  body.append("action", "upload");
  body.append("clientId", clientId);
  body.append("batchId", batchId);
  body.append("pictureId", picture.id);
  body.append("file", picture.blob, `${picture.id}.webp`);
  const { data, error } = await supabase.functions.invoke("progress-picture-media", {
    body,
  });
  if (error) throw new Error(`Progress picture upload failed: ${error.message}`);
  if (!data || typeof data !== "object" || (data as { path?: unknown }).path !== storagePath) {
    throw new Error("Progress picture upload returned an unexpected path.");
  }
}

async function cleanupProgressPictureObjects({
  clientId,
  paths,
}: {
  clientId: string;
  paths: string[];
}): Promise<void> {
  const { error } = await supabase.functions.invoke("progress-picture-media", {
    body: { action: "cleanup", clientId, paths },
  });
  if (error) throw error;
}

function randomIndex(length: number): number {
  if (length <= 1) return 0;
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % length;
  }
  return Math.floor(Math.random() * length);
}

function mapBatch(row: BatchRow, pictures: ProgressPicture[]): ProgressPictureBatch {
  return {
    id: row.id,
    clientId: row.client_id,
    captureDate: row.capture_date,
    timezone: row.timezone,
    previewPictureId: row.preview_picture_id ?? undefined,
    pictures,
    createdAt: row.created_at,
  };
}

function mapPicture(row: PictureRow, imageUrl: string): ProgressPicture {
  return {
    id: row.id,
    imageUrl,
    storagePath: row.storage_path,
    width: row.width,
    height: row.height,
    byteSize: row.byte_size,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}
