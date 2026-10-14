import { Controller, Get, Param, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { UserProfileImageService } from "../services/user-profile-image.service";

/** One year: every new photo gets a new file name, so a copy never goes stale. */
const CACHE_MAXIMUM_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Open to anyone, like the public page that shows it. Only the photo a
 * broker currently uses is served, always as a webp the server drew itself.
 */
@SkipThrottle()
@Controller("profile-images")
export class ProfileImageController {
  constructor(
    private readonly userProfileImageService: UserProfileImageService,
  ) {}

  @Get(":userId/:fileName")
  async read(
    @Param("userId") userId: string,
    @Param("fileName") fileName: string,
    @Res() response: Response,
  ) {
    const image = await this.userProfileImageService.read(userId, fileName);
    response.set({
      "Content-Type": "image/webp",
      "Content-Disposition": "inline",
      "Content-Length": String(image.length),
      "Cache-Control": `public, max-age=${CACHE_MAXIMUM_AGE_SECONDS}, immutable`,
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    response.send(image);
  }
}
