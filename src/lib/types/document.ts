export interface ParsedPage {
  pageNumber: number;
  content: string;
}

export interface ParsedPdf {
  pageCount: number;
  pages: ParsedPage[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  page: number;
  documentId: string;
  documentName: string;
}