export type ResumeDownloadFormat = 'pdf' | 'docx' | 'md' | 'txt';

export const ACCEPTED_RESUME_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.markdown',
  '.rtf',
  '.html',
  '.htm',
] as const;

export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export function getSupportedExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx === -1) return '';
  return fileName.slice(idx).toLowerCase().trim();
}

export function isSupportedResumeExtension(ext: string): boolean {
  return (ACCEPTED_RESUME_EXTENSIONS as readonly string[]).includes(ext);
}

export function buildSafeResumeFilename(
  candidateName: string,
  format: ResumeDownloadFormat
): string {
  const slug = candidateName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = slug || 'resume';
  return `${base}-resume.${format}`;
}

export function markdownToPlainText(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
      continue;
    }
    if (trimmed === '---' || trimmed === '***') {
      continue;
    }

    const isBullet = /^[-*•]\s+/.test(trimmed);
    const bodyText = isBullet ? trimmed.replace(/^[-*•]\s+/, '').trim() : trimmed;

    const cleaned = bodyText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1');

    if (isBullet) {
      output.push(`• ${cleaned}`);
    } else if (cleaned.startsWith('### ')) {
      output.push(cleaned.slice(4).trim());
    } else if (cleaned.startsWith('## ')) {
      if (output.length > 0 && output[output.length - 1] !== '') {
        output.push('');
      }
      output.push(cleaned.slice(3).trim().toUpperCase());
    } else if (cleaned.startsWith('# ')) {
      output.push(cleaned.slice(2).trim());
    } else {
      output.push(cleaned);
    }
  }

  return output.join('\n').trim();
}

export function stripHtmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const withBreaks = withoutScripts
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, '\n');

  const stripped = withBreaks.replace(/<[^>]+>/g, ' ');

  const decoded = stripped
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");

  return decoded
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export function stripRtfToText(rtf: string): string {
  const withoutGroups = rtf
    .replace(/\{\\(?:\*|fonttbl|colortbl|stylesheet|info|pict|object)[\s\S]*?\}/gi, ' ')
    .replace(/\\par\b/gi, '\n')
    .replace(/\\line\b/gi, '\n')
    .replace(/\\tab\b/gi, ' ')
    .replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '');

  return withoutGroups
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}
