import { z } from "zod";
import { catalog } from "@/lib/catalog";
import {
  decodeBuild,
  encodeBuild,
} from "@/lib/codec/build-codec";
import { BUILD_VERSION, type BuildState } from "@/lib/schema/build";

export const BUILD_DRAFT_STORAGE_KEY = "relink-build-draft";

const buildDraftSchema = z.object({
  buildVersion: z.literal(BUILD_VERSION),
  catalogVersion: z.number().int().positive(),
  payload: z.string().min(1),
  fromShare: z.string().nullable(),
  dirty: z.boolean(),
  updatedAt: z.number().int().nonnegative(),
});

export type BuildDraft = z.infer<typeof buildDraftSchema>;

export function shareFingerprint(
  params: URLSearchParams | { v?: string | null; b?: string | null },
): string | null {
  const v =
    params instanceof URLSearchParams ? params.get("v") : (params.v ?? null);
  const b =
    params instanceof URLSearchParams ? params.get("b") : (params.b ?? null);
  if (v == null && b == null) return null;
  return `v=${v ?? ""}&b=${b ?? ""}`;
}

export function fingerprintForBuild(build: BuildState): string {
  return `v=${BUILD_VERSION}&b=${encodeBuild(build)}`;
}

export function readBuildDraft(): BuildDraft | null {
  try {
    const raw = localStorage.getItem(BUILD_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const draft = buildDraftSchema.safeParse(parsed);
    if (!draft.success) return null;
    if (draft.data.catalogVersion > catalog.meta.catalogVersion) return null;
    return draft.data;
  } catch {
    return null;
  }
}

export function writeBuildDraft(input: {
  build: BuildState;
  fromShare: string | null;
  dirty: boolean;
}): void {
  try {
    const draft: BuildDraft = {
      buildVersion: BUILD_VERSION,
      catalogVersion: catalog.meta.catalogVersion,
      payload: encodeBuild(input.build),
      fromShare: input.fromShare,
      dirty: input.dirty,
      updatedAt: Date.now(),
    };
    localStorage.setItem(BUILD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function decodeDraftBuild(draft: BuildDraft): BuildState | null {
  const decoded = decodeBuild(draft.payload);
  return decoded.ok ? decoded.build : null;
}
