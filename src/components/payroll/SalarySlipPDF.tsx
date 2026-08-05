/**
 * SalarySlipPDF Generator
 * Uses html2canvas to capture the SalarySlipPreview HTML and convert to PDF,
 * ensuring the downloaded PDF looks identical to the on-screen view.
 * The Calculation Breakdown section is excluded from the PDF via the forPDF prop.
 */

import { EmployeeSalary, PayrollSettings, SalarySlipTemplate } from '@/types/payroll.types';

export async function generateSalarySlipPDF(
  slip: EmployeeSalary,
  settings: PayrollSettings,
  template?: SalarySlipTemplate | null
): Promise<void> {
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
  container.setAttribute('data-for-pdf', 'true');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = 'white';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  try {
    // Dynamically import the SalarySlipPreview component
    const { SalarySlipPreview } = await import('@/components/payroll/SalarySlipPreview');

    // Render the preview offscreen with forPDF=true (hides Calculation Breakdown)
    const root = ReactDOMClient.createRoot(container);
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(SalarySlipPreview, {
          slip,
          settings,
          template: template ?? null,
          forPDF: true,
        })
      );
      // Wait for rendering to complete
      setTimeout(resolve, 500);
    });

    // Get the rendered slip content
    const slipContent = container.querySelector('.bg-white');
    if (!slipContent) {
      throw new Error('Failed to find slip content for PDF capture');
    }

    // Capture the HTML as a canvas
    const canvas = await html2canvas(slipContent as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: slipContent.scrollWidth,
      height: slipContent.scrollHeight,
    });

    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('portrait', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // If the image fits on one page, add it directly
    if (imgHeight <= pdfHeight - 20) {
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    } else {
      // Multi-page: slice the canvas into page-sized chunks
      let yOffset = 0;
      const pageContentHeight = pdfHeight - 20; // usable height per page
      const sourcePageHeight = (pageContentHeight / imgHeight) * canvas.height;

      while (yOffset < canvas.height) {
        if (yOffset > 0) {
          pdf.addPage();
        }

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(sourcePageHeight, canvas.height - yOffset);

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, yOffset, canvas.width, pageCanvas.height,
            0, 0, canvas.width, pageCanvas.height
          );

          const pageImgData = pageCanvas.toDataURL('image/png');
          const sliceHeight = (pageCanvas.height * imgWidth) / canvas.width;
          pdf.addImage(pageImgData, 'PNG', 10, 10, imgWidth, sliceHeight);
        }

        yOffset += sourcePageHeight;
      }
    }

    // Save the PDF
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    pdf.save(`SalarySlip_${slip.employeeCode}_${monthNames[slip.month]}_${slip.year}.pdf`);

    // Clean up
    root.unmount();
  } finally {
    document.body.removeChild(container);
  }
}
