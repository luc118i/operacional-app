export type LocationType =
  | "GARAGEM"
  | "RODOVIARIA"
  | "PC"
  | "POSTO"
  | "RESTAURANTE"
  | "OUTRO";

export interface LocationInput {
  sigla: string;
  descricao: string;
  cidade: string;
  uf: string;
  tipo: LocationType;
  lat: number;
  lng: number;
}
