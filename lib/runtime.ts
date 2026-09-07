import path from "path";

export function isServerless() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function writableDir(...parts: string[]) {
  const root = isServerless() ? "/tmp" : process.cwd();
  return path.join(root, ...parts);
}
