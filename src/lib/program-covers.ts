import { supabase } from "@/integrations/supabase/client";
import type { ProgramSummary } from "./coach-programs";
import type { ProcessedProgramCover } from "./program-cover-processing";

export const PROGRAM_COVERS_BUCKET = "program-covers";
const SIGNED_URL_SECONDS = 60 * 60;

export async function fetchProgramCoverUrls(
  programs: readonly ProgramSummary[],
): Promise<Record<string, string>> {
  const coveredPrograms = programs.filter(
    (program): program is ProgramSummary & { coverImagePath: string } =>
      typeof program.coverImagePath === "string" && program.coverImagePath.length > 0,
  );
  if (coveredPrograms.length === 0) return {};

  const paths = coveredPrograms.map((program) => program.coverImagePath);
  const { data, error } = await supabase.storage
    .from(PROGRAM_COVERS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;

  const urls: Record<string, string> = {};
  coveredPrograms.forEach((program, index) => {
    const signedUrl = data?.[index]?.signedUrl;
    if (signedUrl) urls[program.id] = signedUrl;
  });
  return urls;
}

export async function uploadProgramCover({
  coachId,
  programId,
  cover,
}: {
  coachId: string;
  programId: string;
  cover: ProcessedProgramCover;
}): Promise<string> {
  const body = new FormData();
  body.append("coachId", coachId);
  body.append("programId", programId);
  body.append("file", cover.blob, "cover.webp");
  const { data, error } = await supabase.functions.invoke("program-cover-media", {
    body,
  });
  if (error) throw new Error(`Program cover upload failed: ${error.message}`);

  const expectedPath = `${programId}/cover.webp`;
  if (!data || typeof data !== "object" || (data as { path?: unknown }).path !== expectedPath) {
    throw new Error("Program cover upload returned an unexpected path.");
  }
  return expectedPath;
}
