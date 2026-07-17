import type { ShareParseResult } from "@/lib/codec/build-codec";
import type { UiMessages } from "@/lib/i18n/messages";

export function shareParseErrorMessage(
  result: Extract<ShareParseResult, { kind: "error" }>,
  m: UiMessages,
): string {
  switch (result.code) {
    case "unsupported_version":
      return m.unsupportedVersion(result.detail ?? null);
    case "missing_build":
      return m.missingBuild;
    case "invalid":
      return m.decodeInvalid;
    case "validate":
      return m.decodeValidate;
    case "parse":
      return m.decodeParse;
  }
}
