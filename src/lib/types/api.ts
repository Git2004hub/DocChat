export interface UploadResponse {
  documentId: string;
  documentName: string;
  pageCount: number;
  chunkCount: number;
}

export interface ApiError {
  error: string;
  message: string;
}