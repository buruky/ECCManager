import React from 'react';
import TextBoxSection from './TextBoxSection';

export default function ConsentFormsSection({ caseId }: { caseId: string }) {
  return (
    <TextBoxSection
      caseId={caseId}
      sectionName="consentForms"
      placeholder="Record consent form details (type of consent, date signed, expiration, notes, etc.)"
    />
  );
}
