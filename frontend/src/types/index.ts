// Типи для системи сценаріїв
export interface ScenarioBaly {
  dobrochesnist: number; // -2..+2
  efektyvnist: number;   // -2..+2
  dovira: number;        // -2..+2
}

export interface ScenarioNormaRef {
  norma_id: string;
  yak_zastosovuietsia: string;
}

export interface ScenarioNaslidky {
  odrazu: string;
  vidkladeni: string;
}

export interface ScenarioVariant {
  id: string;
  tekst: string;
  naslidky: ScenarioNaslidky;
  baly: ScenarioBaly;
  chomu_taki_baly: string;
  zvorotnyi_zviazok: string;
  normy?: ScenarioNormaRef[];
  nastupnyi_vuzol: string | null;
}

export interface ScenarioVuzol {
  tekst: string;
  zapytannia: string;
  varianty: ScenarioVariant[];
  pytannia_dlia_obhovorennia?: string[];
  zastosovnist?: Record<string, string>;
  porady?: string[];
}

export interface DiiovaNasoba {
  id: string;
  rol: string;
  opys: string;
  hravets?: boolean;
}

export interface DzherelVypadku {
  typ: 'реальний' | 'вигаданий' | 'змішаний';
  opis: string;
}

export interface PerevirkaZmistu {
  fakhivets_dzpk: 'не проведено' | 'в процесі' | 'проведено';
  khto: string | null;
  data: string | null;
  prymitka: string | null;
}

export interface ShiInfo {
  vykorystano: boolean;
  opis: string | null;
}

export interface ScenarioMeta {
  id: string;
  nazva: string;
  audytoriia: string;
  tryvalvist_khv: number;
  temy: string[];
  tsinnosti_v_konflikti: string[];
  dzherelo_vypadku: DzherelVypadku;
  perevirka_zmistu: PerevirkaZmistu;
  shi: ShiInfo;
}

export interface Scenario {
  meta: ScenarioMeta;
  kontekst?: string;
  sytuatsiia: string;
  diiovi_osoby: DiiovaNasoba[];
  pochatkovyi_vuzol: string;
  vuzly: Record<string, ScenarioVuzol>;
}

// Типи норм
export interface Norma {
  id: string;
  akt: string;
  punkt: string;
  redaktsiia: string;
  tsytata: string;
  url: string;
  status: 'zvireno' | 'zvireno-rekomendatsiinyi' | 'ne-zvireno';
}

export interface NormyData {
  meta: {
    version: string;
    data_stanom_na: string;
    dzherelo: string;
    prymitka: string;
  };
  normy: Norma[];
}

// Стан прогресу гравця (Solo Mode)
export interface PlayerDecision {
  vuzolId: string;
  variantId: string;
  baly: ScenarioBaly;
  timestamp: number;
}

export interface ScenarioProgress {
  scenarioId: string;
  decisions: PlayerDecision[];
  currentVuzol: string | null;
  completed: boolean;
  startedAt: number;
  completedAt?: number;
}

// Груповий режим
export interface GroupRoom {
  roomCode: string;
  scenarioId: string;
  currentVuzol: string;
  status: 'waiting' | 'voting' | 'results' | 'completed';
  votes: Record<string, Record<string, number>>; // vuzolId -> variantId -> count
  chosenVariant: Record<string, string>; // vuzolId -> chosen variantId
  participantCount: number;
  votersCount: number;
}

// Мова UI
export type UILanguage = 'uk' | 'en';

// Режим
export type AppMode = 'catalog' | 'solo' | 'group-facilitator' | 'group-participant' | 'builder';
