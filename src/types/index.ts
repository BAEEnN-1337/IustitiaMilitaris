export interface Scores {
  dobrochesnist: number; // -2 .. +2
  efektyvnist: number;   // -2 .. +2
  dovira: number;        // -2 .. +2
}

export interface Consequences {
  odrazu: string;
  vidkladeni: string;
}

export interface Variant {
  id: string; // ^[A-Z][0-9]?$
  tekst: string;
  naslidky: Consequences;
  baly: Scores;
  chomu_taki_baly: string;
  zvorotnyi_zviazok: string;
  normy: string[];
  nastupnyi_vuzol: string | null;
}

export interface Node {
  id: string; // ^V[0-9]+$
  tekst: string;
  zapytannia: string;
  varianty: Variant[];
}

export interface Role {
  id: string; // ^R[0-9]+$
  rol: string;
  opys: string;
  hravets?: boolean;
}

export interface ValueConflict {
  tsinnist_a: string;
  tsinnist_b: string;
  poiasnennia: string;
}

export interface ScenarioNorm {
  id: string;
  yak_zastosovuietsia: string;
}

export interface VerificationInfo {
  fakhivets_dzpk: 'не проведено' | 'проведено' | 'проведено із зауваженнями';
  khto: string | null;
  data: string | null;
  prymitka: string;
}

export interface AiInfo {
  vykorystano: boolean;
  instrument: string | null;
  shcho_zrobleno: string;
  perevirka_liudynoiu: string;
}

export interface CaseSource {
  typ: 'вигаданий' | 'знеособлений з практики';
  opys: string;
}

export interface Scenario {
  id: string;
  nazva: string;
  versiia: string;
  data_stvorennia: string;
  tema: string;
  audytoriia: string[];
  tryvalist_khv: number;
  kontekst: string;
  diiovi_osoby: Role[];
  sytuatsiia: string;
  tsinnosti_v_konflikti: ValueConflict[];
  pochatkovyi_vuzol: string;
  vuzly: Node[];
  normy: ScenarioNorm[];
  zastosovnist: string;
  porady: string[];
  pytannia_dlia_obhovorennia: string[];
  dzherelo_vypadku: CaseSource;
  perevirka_zmistu: VerificationInfo;
  shi: AiInfo;
}

export interface NormEntry {
  id: string;
  akt: string;
  punkt: string;
  korotko: string;
  tsytaty: string[];
  redaktsiia: string;
  posylannia: string;
  typ: string;
  status_zvirky: 'zvireno' | 'zvireno-rekomendatsiinyi' | 'ne-zvireno';
  dzherelo_zvirky: string;
  data_zvirky: string;
}

export interface NormsData {
  nazva: string;
  versiia: string;
  data_stanu: string;
  prymitka: string;
  statusy: Record<string, string>;
  normy: NormEntry[];
}

export interface RoomState {
  code: string;
  scenarioId: string;
  currentNodeId: string;
  votingActive: boolean;
  votes: Record<string, number>;
  totalVotes: number;
  participantsCount: number;
  history: {
    nodeId: string;
    selectedVariantId?: string;
    votes: Record<string, number>;
    totalVotes: number;
  }[];
  discussionIndex?: number; // 0 to 1
  createdAt: number;
}
