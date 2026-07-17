import { z } from "zod";

export const entityIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/, "id must be kebab-case");

export type EntityId = z.infer<typeof entityIdSchema>;

export {
  localizedNameSchema,
  localizedTextSchema,
  localeSchema,
  type LocalizedName,
  type Locale,
} from "@/lib/i18n/locale";
