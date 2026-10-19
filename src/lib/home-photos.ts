import fs from "node:fs";
import path from "node:path";

/**
 * Photo slots for the homepage. Drop a file named after the slot into
 * public/images/home/ (e.g. hyrox.jpg) and it replaces the designed placeholder.
 */
export const PHOTO_SLOTS = ["hyrox", "crossfit", "powerlifting", "running", "bodybuilding", "yoga", "pilates", "coach"] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

const DIR = path.join(process.cwd(), "public", "images", "home");
const EXTENSIONS = ["jpg", "jpeg", "webp", "png", "avif"];

export function homePhotos(): Record<PhotoSlot, string | null> {
  return Object.fromEntries(
    PHOTO_SLOTS.map((slot) => {
      const ext = EXTENSIONS.find((e) => fs.existsSync(path.join(DIR, `${slot}.${e}`)));
      return [slot, ext ? `/images/home/${slot}.${ext}` : null];
    }),
  ) as Record<PhotoSlot, string | null>;
}
