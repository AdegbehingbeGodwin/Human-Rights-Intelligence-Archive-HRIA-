
export enum Region {
  GLOBAL = 'Global',
  AFRICA = 'Africa',
  AMERICAS = 'Americas',
  ASIA_PACIFIC = 'Asia-Pacific',
  EUROPE_CENTRAL_ASIA = 'Europe and Central Asia',
  MIDDLE_EAST_NORTH_AFRICA = 'Middle East and North Africa'
}

export interface DocumentEntry {
  id: string;
  title: string;
  year: number;
  region: Region;
  institution: string;
  abstract: string;
  fullText: string;
}

export interface DocumentIntelligence {
  themes: string[];
  violations: string[];
  countries: string[];
  insights: string;
  confidenceScore: number;
}

export type Page = 'landing' | 'explorer' | 'document' | 'search';
