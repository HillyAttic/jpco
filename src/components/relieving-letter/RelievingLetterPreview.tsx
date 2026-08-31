/**
 * Relieving Letter Preview Component
 * Renders the HTML preview of a relieving letter for display and PDF generation
 * Uses the letter head image as the page background
 */

import { RelievingLetter } from '@/types/relieving-letter.types';
import { format } from 'date-fns';

interface RelievingLetterPreviewProps {
  letter: RelievingLetter;
}

export function RelievingLetterPreview({ letter }: RelievingLetterPreviewProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      id="relieving-letter-preview"
      className="text-black"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: 'Times New Roman, serif',
        fontSize: '12pt',
        lineHeight: '1.6',
        backgroundImage: "url('/images/letter-head.jpeg')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        // Padding to keep text in the blank middle area (below header, above footer)
        paddingTop: '180px',
        paddingBottom: '120px',
        paddingLeft: '60px',
        paddingRight: '60px',
      }}
    >
      {/* Date */}
      <div className="mb-8">
        <p>Date: <strong>{formatDate(letter.issueDate)}</strong></p>
      </div>

      {/* Salutation */}
      <div className="mb-6 text-center">
        <p className="font-semibold">To Whomsoever It May Concern</p>
      </div>

      {/* Main Content */}
      <div className="space-y-4 text-justify">
        <p>
          This is to certify that Mr./Ms. <strong>{letter.employeeName}</strong> was employed with{' '}
          <strong>{letter.companyName}</strong> as <strong>{letter.employeeDesignation}</strong>{' '}
          from {formatDate(letter.dateOfJoining)} to {formatDate(letter.dateOfLeaving)}.
        </p>

        <p>
          During this period, the employee performed the assigned duties with sincerity and
          dedication and was a valuable member of the organization. We appreciate the contributions
          made during the tenure of employment.
        </p>

        <p>
          This is also to confirm that Mr./Ms. <strong>{letter.employeeName}</strong> has been
          relieved from the services of <strong>{letter.companyName}</strong> with effect from{' '}
          {formatDate(letter.dateOfLeaving)} after completing all required formalities. At the time
          of leaving, there were no outstanding obligations, and there are no dues pending from our
          end.
        </p>

        <p>
          We thank Mr./Ms. <strong>{letter.employeeName}</strong> for the services rendered and wish
          them every success in their future endeavors.
        </p>
      </div>

      {/* Closing */}
      <div className="mt-4">
        <p className="mb-2">Sincerely,</p>
        <p>For <strong>{letter.companyName}</strong></p>
      </div>

      {/* Signature Block */}
      <div>
        <img
          src="/images/sign.png"
          alt="Digital Signature"
          className="h-20 w-auto -rotate-6"
        />
        <div className="border-t border-black w-64 mb-2"></div>
        <p className="font-semibold">{letter.signatoryName}</p>
        <p>{letter.signatoryDesignation}</p>
      </div>

      {/* Disclaimer */}
      <p className="text-sm italic text-center" style={{ marginTop: '99px' }}>This is a computer-generated statement, thus contains a digital signature.</p>
    </div>
  );
}
