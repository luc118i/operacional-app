// src/types/schemeImport.ts

export type ImportStatus = "VALID" | "INVALID" | "PENDING";

/* =========================
 * VALIDATION
 * ========================= */

export type ValidationIssueLevel = "ERROR" | "WARNING";

export type ValidationIssue = {
  code: string;
  level: ValidationIssueLevel;
  message: string;
  details?: unknown;
};

export type ValidationScheme = {
  externalKey: string;
  codigoLinha: string;
  sentido: string; // backend pode variar casing
  horaPartida: string;
  status: ImportStatus;
  pointsCount: number;
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
};

export type ValidationSummary = {
  totalSchemes: number;
  validSchemes: number;
  invalidSchemes: number;
  totalPoints: number;

  missingLocationsUnique: number;
  missingLocationsOccurrences: number;

  errorsCount: number;
  warningsCount: number;
};

export type ImportValidation = {
  status: ImportStatus;
  summary: ValidationSummary;
  schemes: ValidationScheme[];

  // o backend também envia aqui
  missingLocations?: MissingLocation[];
};

/* =========================
 * MISSING LOCATIONS
 * (ALINHADO 100% AO CURL)
 * ========================= */

export type MissingLocationExample = {
  codigoLinha: string;
  horaPartida: string;
  sentido: string; // "Ida" | "Volta" | "ida" | etc
  externalKey?: string;
};

export type MissingLocation = {
  descricaoNorm: string;
  descricaoRawSample?: string;
  occurrences: number;
  examples: MissingLocationExample[];
};

/* =========================
 * DRY-RUN RESPONSE
 * ========================= */

export type ImportDryRunResponse = {
  ok?: boolean;

  status: ImportStatus;
  importSessionId: string;

  // raiz (usado direto no wizard)
  missingLocations?: MissingLocation[];

  // validações completas
  validation?: ImportValidation;

  // resolve (opcional, mas existe no backend)
  resolve?: {
    totalPoints: number;
    resolvedPoints: number;
    missingCount: number;
    missing: MissingLocation[];
  };
};
