import { registerAs } from "@nestjs/config";

export const bucketConfig = registerAs("bucket", () => ({
  name: process.env.BUCKET_NAME ?? "",
  key: process.env.BUCKET_KEY ?? "",
  token: process.env.BUCKET_TOKEN ?? "",
  secret: process.env.BUCKET_SECRET ?? "",
  url: process.env.BUCKET_URL ?? "",
}));
