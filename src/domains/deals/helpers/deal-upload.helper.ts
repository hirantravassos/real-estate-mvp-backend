import { BadRequestException } from "@nestjs/common";
import type { MulterModuleOptions } from "@nestjs/platform-express";
import type { Request } from "express";
import { memoryStorage } from "multer";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const buildUploadOptions = (
  allowedMimeTypes: string[],
  rejectionMessage: string,
): MulterModuleOptions => ({
  storage: memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_request, file, callback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new BadRequestException(rejectionMessage), false);
  },
});

/** Paperwork of the checklist: PDFs, photos of documents, office files. */
export const dealDocumentUploadOptions = buildUploadOptions(
  DOCUMENT_MIME_TYPES,
  "Tipo de arquivo não permitido. Tipos aceitos: PDF, imagens, Word, Excel, texto.",
);

/** Contracts must be PDF, so they can also be signed on gov.br. */
export const dealContractUploadOptions = buildUploadOptions(
  ["application/pdf"],
  "O contrato precisa ser um arquivo PDF.",
);

export const requireFile = (file: Express.Multer.File | undefined) => {
  if (!file) throw new BadRequestException("Arquivo é obrigatório.");
  return file;
};

export interface RequestEvidence {
  ip: string | null;
  userAgent: string | null;
}

/** Who signed from where, read behind the hosting proxy. */
export const readRequestEvidence = (request: Request): RequestEvidence => {
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedAddress = (
    Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  )
    ?.split(",")[0]
    ?.trim();
  const userAgent = request.headers["user-agent"];

  return {
    ip: (forwardedAddress || request.ip || null)?.substring(0, 64) ?? null,
    userAgent: userAgent ? userAgent.substring(0, 500) : null,
  };
};
