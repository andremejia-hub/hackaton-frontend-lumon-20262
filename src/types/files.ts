/* Praise Kier */
export interface FileSummary {
  id: number;
  name: string;
  status: string;
  rows: number;
  cols: number;
  tileSize: number;
  progress: number;
  mistakes: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileProgress {
  total: number;
  refined: number;
  percent: number;
  bins: { WO: number; FC: number; DR: number; MA: number };
}

export interface FileDetail extends FileSummary {
  progressDetail?: FileProgress;
  minGroupSize?: number;
  maxGroupSize?: number;
}

export interface Tile {
  tileRow: number;
  tileCol: number;
  originRow: number;
  originCol: number;
  rows: number;
  cols: number;
  values: string;
  tremor: string; // base64
  bins: string;
  version: number;
}

export interface RefinementCell {
  r: number;
  c: number;
}

export interface RefinementRequest {
  bin: "WOE" | "FROLIC" | "DREAD" | "MALICE";
  cells: RefinementCell[];
}

export interface RefinementResponse {
  progress: FileProgress;
  version?: number;
}

export interface FilesListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  q?: string;
  sort?: string;
}

export interface FilesListResponse {
  items: FileSummary[];
  total: number;
  page: number;
  pageSize: number;
}
