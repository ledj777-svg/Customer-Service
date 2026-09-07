import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { isServerless, writableDir } from "./runtime";

export async function persistDataUrl(dataUrl?: string) {
  if (!dataUrl?.startsWith("data:image/")) return dataUrl;
  if (isServerless()) return dataUrl;
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/);
  if (!match) return dataUrl;
  const ext = match[1] === "image/png" ? "png" : "jpg";
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = writableDir("public", "uploads");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(match[2], "base64"));
    return `/uploads/${name}`;
  } catch {
    return dataUrl;
  }
}
