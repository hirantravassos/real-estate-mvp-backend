import { registerAs } from "@nestjs/config";

export const bucketConfig = registerAs("bucket", () => ({
  name: process.env.BUCKET_NAME ?? "",
  key: process.env.BUCKET_KEY ?? "",
  secret: process.env.BUCKET_SECRET ?? "",
  url: process.env.BUCKET_URL ?? "",
  region: process.env.BUCKET_REGION || "auto",
  forcePathStyle: process.env.BUCKET_FORCE_PATH_STYLE === "true",
}));
