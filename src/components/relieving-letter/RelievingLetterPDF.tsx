/**
 * Relieving Letter PDF Generator
 * Uses html2canvas to capture the RelievingLetterPreview HTML and convert to PDF
 */

import { RelievingLetter } from '@/types/relieving-letter.types';

export async function generateRelievingLetterPDF(letter: RelievingLetter): Promise<void> {
  const [html2canvasModule, jsPDFModule] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const html2canvas = html2canvasModule.default;
  const jsPDF = jsPDFModule.default;

  // Dynamically import React and ReactDOM to render the preview offscreen
  const React = await import('react');
  const ReactDOMClient = await import('react-dom/client');

  // Create a temporary container for offscreen rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = 'white';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  try {
    // Dynamically import the RelievingLetterPreview component
    const { RelievingLetterPreview } = await import('@/components/relieving-letter/RelievingLetterPreview');

    // Render the preview offscreen
    const root = ReactDOMClient.createRoot(container);
    await new Promise<void>((resolve) => {
      root.render(React.createElement(RelievingLetterPreview, { letter }));
      // Wait for render to complete
      setTimeout(resolve, 100);
    });

    // Capture the rendered content
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    // Generate filename
    const safeEmployeeName = letter.employeeName.replace(/\s+/g, '_');
    const filename = `RelievingLetter_${letter.letterNumber}_${safeEmployeeName}.pdf`;

    pdf.save(filename);
  } finally {
    // Clean up the container
    document.body.removeChild(container);
  }
}
