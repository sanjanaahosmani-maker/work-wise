import {
  buildSafeResumeFilename,
  markdownToPlainText,
  type ResumeDownloadFormat,
} from './fileParsing';
import { parseResumeMarkdown } from './resumeHelpers';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function generatePdfBlob(resumeMarkdown: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 48;
  const marginBottom = 48;
  const contentWidth = pageWidth - marginX * 2;

  let y = marginTop;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  const blocks = parseResumeMarkdown(resumeMarkdown);

  for (const block of blocks) {
    if (block.type === 'h1') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(block.text, contentWidth) as string[];
      ensureSpace(lines.length * 22 + 4);
      doc.text(lines, marginX, y);
      y += lines.length * 22;
    } else if (block.type === 'contact') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(block.text, contentWidth) as string[];
      ensureSpace(lines.length * 14 + 10);
      doc.text(lines, marginX, y);
      y += lines.length * 14 + 4;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.75);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 12;
    } else if (block.type === 'h2') {
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(block.text.toUpperCase(), contentWidth) as string[];
      ensureSpace(lines.length * 15 + 12);
      doc.text(lines, marginX, y);
      y += lines.length * 15 - 2;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 12;
    } else if (block.type === 'h3') {
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(block.text, contentWidth) as string[];
      ensureSpace(lines.length * 14 + 4);
      doc.text(lines, marginX, y);
      y += lines.length * 14 + 2;
    } else if (block.type === 'bullet') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const bulletIndent = 14;
      const lines = doc.splitTextToSize(block.text, contentWidth - bulletIndent) as string[];
      ensureSpace(lines.length * 14 + 3);
      doc.text('•', marginX + 2, y);
      doc.text(lines, marginX + bulletIndent, y);
      y += lines.length * 14 + 2;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(block.text, contentWidth) as string[];
      ensureSpace(lines.length * 14 + 3);
      doc.text(lines, marginX, y);
      y += lines.length * 14 + 3;
    }
  }

  return doc.output('blob');
}

async function generateDocxBlob(resumeMarkdown: string): Promise<Blob> {
  const { BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
  const blocks = parseResumeMarkdown(resumeMarkdown);

  const children = blocks.map((block) => {
    if (block.type === 'h1') {
      return new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: block.text,
            bold: true,
            size: 36,
            color: '0F172A',
          }),
        ],
      });
    }

    if (block.type === 'contact') {
      return new Paragraph({
        spacing: { after: 180 },
        border: {
          bottom: {
            color: 'CBD5E1',
            space: 6,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        children: [
          new TextRun({
            text: block.text,
            size: 20,
            color: '475569',
          }),
        ],
      });
    }

    if (block.type === 'h2') {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 80 },
        border: {
          bottom: {
            color: 'E2E8F0',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 4,
          },
        },
        children: [
          new TextRun({
            text: block.text.toUpperCase(),
            bold: true,
            size: 22,
            color: '0F172A',
          }),
        ],
      });
    }

    if (block.type === 'h3') {
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 120, after: 40 },
        children: [
          new TextRun({
            text: block.text,
            bold: true,
            size: 21,
            color: '0F172A',
          }),
        ],
      });
    }

    if (block.type === 'bullet') {
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: block.text,
            size: 20,
            color: '334155',
          }),
        ],
      });
    }

    return new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: block.text,
          size: 20,
          color: '334155',
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function exportResumeFile(
  resumeMarkdown: string,
  candidateName: string,
  format: ResumeDownloadFormat
): Promise<string> {
  const filename = buildSafeResumeFilename(candidateName, format);

  if (format === 'pdf') {
    const blob = await generatePdfBlob(resumeMarkdown);
    triggerBlobDownload(blob, filename);
    return filename;
  }

  if (format === 'docx') {
    const blob = await generateDocxBlob(resumeMarkdown);
    triggerBlobDownload(blob, filename);
    return filename;
  }

  if (format === 'txt') {
    const plain = markdownToPlainText(resumeMarkdown);
    const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, filename);
    return filename;
  }

  const blob = new Blob([resumeMarkdown], { type: 'text/markdown;charset=utf-8' });
  triggerBlobDownload(blob, filename);
  return filename;
}
