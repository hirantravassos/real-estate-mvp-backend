/** Raw answer of the Infosimples consultation API. */
export interface InfosimplesRawResponse {
  code: number;
  code_message?: string;
  header?: {
    billable?: boolean;
    /** In reais, like "0.24". */
    price?: string | number;
  };
  data?: Record<string, unknown>[];
  errors?: string[];
  site_receipts?: string[];
}

export interface InfosimplesConsultation {
  code: number;
  message: string;
  /** Only billable answers are charged by Infosimples. */
  billable: boolean;
  priceInBrl: number | null;
  data: Record<string, unknown>[];
  /** Short lived links to the files the portal gave, usually the PDF itself. */
  receiptUrls: string[];
}

export interface InfosimplesReceipt {
  buffer: Buffer;
  mimeType: string;
}

/** Codes of a finished query, every other code is a failure. */
export const INFOSIMPLES_SUCCESS_CODE = 200;
export const INFOSIMPLES_NOT_FOUND_CODE = 612;
