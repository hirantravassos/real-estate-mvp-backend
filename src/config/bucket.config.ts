import { registerAs } from "@nestjs/config";

export const bucketConfig = registerAs("bucket", () => ({
  name: process.env.BUCKET_NAME ?? "",
  key: process.env.BUCKET_KEY ?? "",
  secret: process.env.BUCKET_SECRET ?? "",
  url: process.env.BUCKET_URL ?? "",
  region: process.env.BUCKET_REGION || "auto",
  forcePathStyle: process.env.BUCKET_FORCE_PATH_STYLE === "true",
  /** Sites allowed to upload straight to the bucket, comma separated. */
  corsOrigins: [
    ...new Set(
      (
        process.env.BUCKET_CORS_ORIGINS ||
        [process.env.APP_FRONTEND_URL, process.env.APP_CORS_ORIGIN]
          .filter(Boolean)
          .join(",")
      )
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ),
  ],
}));
