import React from 'react';
import { GroupSession } from './GroupSession';
import type { Scenario } from '../types';
import type { Language } from '../i18n';
export const ClassroomFacilitator = (props: {
  scenario: Scenario;
  onExit: () => void;
  lang: Language;
}) => <GroupSession {...props} host />;
