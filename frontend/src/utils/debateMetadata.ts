import { DebateMode } from '../types';

const METADATA_KEY = 'ciceronia_debate_metadata_v1';

type DebateMetadata = {
  mode?: DebateMode;
  created_ts?: number;
};

type MetadataMap = Record<string, DebateMetadata>;

const readMetadataMap = (): MetadataMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(METADATA_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MetadataMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeMetadataMap = (map: MetadataMap) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(METADATA_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
};

export const saveDebateMetadata = (debateCode: string, metadata: DebateMetadata) => {
  if (!debateCode) return;
  const map = readMetadataMap();
  map[debateCode] = { ...(map[debateCode] || {}), ...metadata };
  writeMetadataMap(map);
};

export const loadDebateMetadata = (debateCode: string): DebateMetadata | null => {
  if (!debateCode) return null;
  const map = readMetadataMap();
  return map[debateCode] || null;
};

