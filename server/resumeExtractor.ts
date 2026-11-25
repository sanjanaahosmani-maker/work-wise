import {
  getSupportedExtension,
  isSupportedResumeExtension,
  MAX_RESUME_FILE_BYTES,
  stripHtmlToText,
  stripRtfToText,
} from '../src/utils/fileParsing';

export interface ExtractedResumeResult {
  text: string;
  fileName: string;
  fileType: string;
}

export class FileExtractionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function extractResumeTextFromBase64(
  fileName: string,
  base64Content: string
): Promise<ExtractedResumeResult> {
  const cleanName = fileName.trim();
  if (!cleanName) {
    throw new FileExtractionError('File name is required.');
  }

  const ext = getSupportedExtension(cleanName);
  if (ext === '.doc') {
    throw new FileExtractionError(
      'Legacy .doc files are not supported directly. Please save as .docx, .pdf, or .txt.'
    );
  }
  if (!isSupportedResumeExtension(ext)) {
    throw new FileExtractionError(
      `Unsupported file type (${ext || 'unknown'}). Upload a PDF, DOCX, TXT, MD, RTF, or HTML file.`
    );
  }

  const cleanedBase64 = base64Content.includes(',')
    ? base64Content.slice(base64Content.indexOf(',') + 1)
    : base64Content;

  if (!cleanedBase64.trim()) {
    throw new FileExtractionError('Uploaded file appears to be empty.');
  }

  const buffer = Buffer.from(cleanedBase64, 'base64');
  if (buffer.byteLength === 0) {
    throw new FileExtractionError('Uploaded file is empty.');
  }
  if (buffer.byteLength > MAX_RESUME_FILE_BYTES) {
    throw new FileExtractionError('File exceeds the 5 MB size limit.');
  }

  let extracted = '';

  if (ext === '.pdf') {
    const { extractText } = await import('unpdf');
    const result = await extractText(new Uint8Array(buffer), { mergePages: true });
    extracted = Array.isArray(result.text)
      ? result.text.join('\n\n')
      : String(result.text ?? '');
  } else if (ext === '.docx') {
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default ?? mammothModule;
    const result = await mammoth.extractRawText({ buffer });
    extracted = result.value ?? '';
  } else if (ext === '.html' || ext === '.htm') {
    extracted = stripHtmlToText(buffer.toString('utf8'));
  } else if (ext === '.rtf') {
    extracted = stripRtfToText(buffer.toString('utf8'));
  } else {
    extracted = buffer.toString('utf8');
  }

  const normalized = extracted
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 25000);

  if (!normalized) {
    throw new FileExtractionError(
      'No selectable text was found in this file. If it is a scanned image PDF, please copy and paste the text or upload a text-based PDF, DOCX, or TXT file.'
    );
  }

  return {
    text: normalized,
    fileName: cleanName,
    fileType: ext.slice(1).toUpperCase(),
  };
}
