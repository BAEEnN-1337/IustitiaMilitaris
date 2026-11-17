import { Scenario, NormsData } from '../types';

import s01 from '../../stsenarii/S01-spravedlyvist-rozpodilu.json';
import s02 from '../../stsenarii/S02-nedotorkannyi-kandydat.json';
import s03 from '../../stsenarii/S03-svoikh-ne-zdaiut.json';
import normyDataRaw from '../../normy.json';

export const allScenarios: Scenario[] = [
  s01 as unknown as Scenario,
  s02 as unknown as Scenario,
  s03 as unknown as Scenario
];

export const teamScenarios: Scenario[] = allScenarios;
export const starterExamples: Scenario[] = [];

export const normyData: NormsData = normyDataRaw as unknown as NormsData;

export const normMap = new Map(normyData.normy.map((n) => [n.id, n]));
