import path from "path";
import os from "os";

export function isServerless() {
  return Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NOW_REGION ||
    (typeof process.cwd === "function" && process.cwd().startsWith("/var/task"))
  );
}

export function writableDir(...parts: string[]) {
  const root = isServerless() ? os.tmpdir() : process.cwd();
  return path.join(root, ...parts);
}

