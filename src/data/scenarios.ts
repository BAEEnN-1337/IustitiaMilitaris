import { Scenario, NormsData } from '../types';

import s01 from '../../stsenarii/S01-podiaka-batkivskoho-komitetu.json';
import s02 from '../../stsenarii/S02-kandydat-syn-pobratyma.json';
import s03 from '../../stsenarii/S03-akt-na-palne.json';
import s04 from '../../stsenarii/S04-kursova-za-nich.json';
import s05 from '../../stsenarii/S05-mashyna-dlia-dobroi-spravy.json';
import s06 from '../../stsenarii/S06-reviziia-na-skladi.json';
import s07 from '../../stsenarii/S07-terminova-lohistyka.json';
import s08 from '../../stsenarii/S08-kadrovyi-vidbir-pid-tyskom.json';
import normyDataRaw from '../../normy.json';

export const allScenarios: Scenario[] = [
  s01 as unknown as Scenario,
  s02 as unknown as Scenario,
  s03 as unknown as Scenario,
  s04 as unknown as Scenario,
  s05 as unknown as Scenario,
  s06 as unknown as Scenario,
  s07 as unknown as Scenario,
  s08 as unknown as Scenario,
];

// Team scenarios (3+ stages) S06, S07, S08
export const teamScenarios: Scenario[] = allScenarios.filter(s => ['S06', 'S07', 'S08'].includes(s.id));

// Organizer starter examples (2 stages) S01-S05
export const starterExamples: Scenario[] = allScenarios.filter(s => ['S01', 'S02', 'S03', 'S04', 'S05'].includes(s.id));

export const normyData: NormsData = normyDataRaw as unknown as NormsData;

export const normMap = new Map(normyData.normy.map(n => [n.id, n]));
