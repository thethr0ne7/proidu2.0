export type ScoreMode = 'route' | 'reachable' | 'all';
export type ScoreFit = 'safe' | 'realistic' | 'ambitious' | 'below' | 'no_history' | 'not_requested';

export interface ExamRequirement {
  subject: string;
  min_score: number | null;
  priority: number;
  choice_group: number | null;
  exam_kind: 'ege' | 'dvi' | 'internal' | 'creative' | 'professional' | string;
}

export interface FederalProgramResult {
  institution_id: string;
  institution_name: string;
  institution_short_name?: string | null;
  region_id?: string | null;
  region_name?: string | null;
  city?: string | null;
  program_id: string;
  code: string;
  title: string;
  profile_title?: string | null;
  level: string;
  study_form: string;
  admission_year: number;
  subjects: string[];
  exam_requirements: ExamRequirement[];
  minimum_scores: Record<string, number>;
  cutoff_score?: number | null;
  cutoff_year?: number | null;
  budget_places?: number | null;
  paid_places?: number | null;
  user_score?: number | null;
  score_gap?: number | null;
  score_fit: ScoreFit;
  verification_status: 'verified' | 'partial';
  source_url?: string | null;
}

export interface FederalSearchParams {
  action?: 'programs';
  query?: string;
  subjects?: string[];
  scores?: Record<string, number>;
  totalScore?: number;
  region?: string;
  budgetOnly?: boolean;
  year?: number;
  scoreMode?: ScoreMode;
  ambitiousGap?: number;
  limit?: number;
}

export interface FederalCoverage {
  regions_count: number;
  institutions_count: number;
  programs_count: number;
  verified_programs_count: number;
  offers_2026_count: number;
  cutoff_2025_count: number;
  updated_at: string;
}

export interface AchievementInput {
  honors: boolean;
  volunteer: boolean;
  gtoLevel: 'none' | 'gold' | 'silver' | 'bronze';
}

export interface AchievementPoint {
  type: string;
  title: string;
  points: number;
  source_url?: string | null;
}

export interface RouteDeadline {
  event_type: string;
  event_at: string;
  description: string;
  source_url?: string | null;
  verification_status: 'verified' | 'partial';
}

export interface RouteDocument {
  document_code: string;
  label: string;
  conditions: Record<string, unknown>;
  source_url?: string | null;
  verification_status: 'verified' | 'partial';
}

export interface FullRouteItem extends FederalProgramResult {
  priority: number;
  id_points: number;
  id_breakdown: AchievementPoint[];
  effective_score: number;
  route_score_gap: number | null;
  route_score_fit: ScoreFit;
  deadlines: RouteDeadline[];
  documents: RouteDocument[];
}

export interface FullRouteResponse {
  items: FullRouteItem[];
  diversification: {
    institutions: number;
    cities: number;
    categories: Record<string, number>;
  };
  warnings: string[];
  generated_at: string;
  disclaimer: string;
}

// Same-origin API; Vite proxies /api locally and Timeweb reverse-proxies it in production.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

export interface SearchPage {
  data: FederalProgramResult[];
  meta: { count: number; next_cursor: string | null; limited_by_scan: boolean; ranking_scope: string };
}

async function postApi<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(API_BASE + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.detail ?? json.error ?? 'Ошибка API PROIDU');
  return json as T;
}

export async function searchFederalProgramPage(params: FederalSearchParams & { cursor?: string }): Promise<SearchPage> {
  return postApi<SearchPage>('/search', {
    action: 'programs', scoreMode: 'route', ambitiousGap: 20, limit: 200, ...params,
  });
}

export async function searchFederalPrograms(params: FederalSearchParams): Promise<FederalProgramResult[]> {
  return (await searchFederalProgramPage(params)).data;
}

export async function getFederalCoverage(): Promise<FederalCoverage | null> {
  const response = await postApi<{data: FederalCoverage | null}>('/search', {action:'coverage',year:2026});
  return response.data;
}

export async function buildFullRoute(payload: {
  programIds: string[]; scores: Record<string, number>; totalScore?: number;
  achievements: AchievementInput; year?: number;
}): Promise<FullRouteResponse> {
  const response = await postApi<{data: FullRouteResponse}>('/route', { year:2026, ...payload });
  return response.data;
}

export interface SpoRouteResult {
  program_id: string; code: string; title: string; profile_title?: string | null;
  institution_name: string; institution_short_name?: string | null;
  city?: string | null; region_name?: string | null; route_type: string;
  internal_exams: string[]; source_url: string; verification_status: 'verified';
}
export interface SpoRoutePage {
  data: SpoRouteResult[];
  meta: {count:number; fallback: string | null; warning: string | null; year:number};
}

export async function searchSpoRoutes(params: {
  spoCode: string; query?: string; region?: string; year?:number;
}): Promise<SpoRoutePage> {
  return postApi<SpoRoutePage>('/spo/routes', {year:2026, ...params});
}

export async function createFullRouteInvoice(_payload: unknown): Promise<string> {
  throw new Error('Платежи отключены до запуска защищённого платёжного контура.');
}
