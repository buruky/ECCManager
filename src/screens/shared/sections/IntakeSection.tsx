import React from 'react';
import TextBoxSection from './TextBoxSection';

export default function IntakeSection({ caseId }: { caseId: string }) {
  return (
    <TextBoxSection
      caseId={caseId}
      sectionName="intake"
      placeholder="Enter client intake information (name, DOB, address, phone, gender, language, referral source, household size, etc.)"
    />
  );
}
