import React from 'react';
import TextBoxSection from './TextBoxSection';

export default function ServiceRecordsSection({ caseId }: { caseId: string }) {
  return (
    <TextBoxSection
      caseId={caseId}
      sectionName="serviceRecords"
      placeholder="Record services provided (service type, date, provider, outcome, hours, etc.)"
    />
  );
}
