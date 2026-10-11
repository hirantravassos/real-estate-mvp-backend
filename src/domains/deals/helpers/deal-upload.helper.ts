import { BadRequestException } from "@nestjs/common";
import type { MulterModuleOptions } from "@nestjs/platform-express";
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

export {
  readRequestEvidence,
  type RequestEvidence,
} from "../../../shared/utils/request-evidence.util";
