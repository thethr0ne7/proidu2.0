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

const SEARCH_FALLBACK = 'https://hgivyjjethjwswjrvroy.supabase.co/functions/v1/search';
const ROUTE_FALLBACK = 'https://hgivyjjethjwswjrvroy.supabase.co/functions/v1/route';
const PAYMENT_FALLBACK = 'https://hgivyjjethjwswjrvroy.supabase.co/functions/v1/telegram-payments';

function getSearchEndpoint(): string {
  return (import.meta.env.VITE_SEARCH_FUNCTION_URL as string | undefined) || SEARCH_FALLBACK;
}

function publicHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  return {
    'content-type': 'application/json',
    ...(key ? { apikey: key, authorization: `Bearer ${key}` } : {}),
  };
}

async function postSearch<T>(payload: unknown): Promise<T> {
  const response = await fetch(getSearchEndpoint(), {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? 'Ошибка федерального API');
  return json as T;
}

export async function searchFederalPrograms(params: FederalSearchParams): Promise<FederalProgramResult[]> {
  const json = await postSearch<{ data?: FederalProgramResult[] }>({
    action: 'programs',
    scoreMode: 'route',
    ambitiousGap: 20,
    limit: 200,
    ...params,
  });
  return json.data ?? [];
}

export async function getFederalCoverage(): Promise<FederalCoverage | null> {
  const json = await postSearch<{ data?: FederalCoverage | null }>({ action: 'coverage' });
  return json.data ?? null;
}

export async function buildFullRoute(payload: {
  programIds: string[];
  scores: Record<string, number>;
  totalScore?: number;
  achievements: AchievementInput;
  year?: number;
}): Promise<FullRouteResponse> {
  const endpoint = (import.meta.env.VITE_ROUTE_FUNCTION_URL as string | undefined) || ROUTE_FALLBACK;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify({ year: 2026, ...payload }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? 'Не удалось построить маршрут');
  return json.data;
}

export async function createFullRouteInvoice(payload: unknown): Promise<string> {
  const endpoint = (import.meta.env.VITE_PAYMENT_FUNCTION_URL as string | undefined) || PAYMENT_FALLBACK;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'create_invoice', payload }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.invoiceUrl) throw new Error(json.error ?? 'Не удалось создать счёт');
  return json.invoiceUrl;
}
