import { useState } from "react";
import { MapPin } from "lucide-react";
import * as OpenLocationCodeModule from "open-location-code";

const OpenLocationCodeClass: any =
  (OpenLocationCodeModule as any).OpenLocationCode ?? OpenLocationCodeModule;

const olc: any = new OpenLocationCodeClass();

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import type { LocationInput, LocationType } from "@/types/location";
import type { Location } from "@/services/locations";
import {
  createLocation,
  getLocationBySigla,
  updateLocation,
} from "@/services/locations";

const UF_OPTIONS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];

const UF_REF_COORDS: Record<string, { lat: number; lng: number }> = {
  DF: { lat: -15.7801, lng: -47.9292 },
  GO: { lat: -16.6869, lng: -49.2648 },
  SP: { lat: -23.5505, lng: -46.6333 },
  RJ: { lat: -22.9068, lng: -43.1729 },
  MG: { lat: -19.9167, lng: -43.9345 },
  BA: { lat: -12.9777, lng: -38.5016 },
};

const TIPO_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "GARAGEM", label: "Garagem" },
  { value: "RODOVIARIA", label: "Rodoviária" },
  { value: "PC", label: "Ponto de Apoio (PC)" },
  { value: "POSTO", label: "Posto" },
  { value: "RESTAURANTE", label: "Restaurante" },
  { value: "OUTRO", label: "Outro" },
];

interface LocationCreatePageProps {
  onBack: () => void;
}

export function LocationCreatePage({ onBack }: LocationCreatePageProps) {
  const [sigla, setSigla] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("DF");
  const [tipo, setTipo] = useState<LocationType>("RODOVIARIA");

  const [plusCode, setPlusCode] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Controle de edição
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null
  );
  const isEditMode = !!editingLocationId;

  const resetForm = () => {
    setSigla("");
    setDescricao("");
    setCidade("");
    setUf("DF");
    setTipo("RODOVIARIA");
    setPlusCode("");
    setLat("");
    setLng("");
    setEditingLocationId(null);
    setError(null);
    setSuccess(null);
  };

  const fillFormFromLocation = (location: Location) => {
    setEditingLocationId(location.id);
    setSigla(location.sigla ?? "");
    setDescricao(location.descricao ?? "");
    setCidade(location.cidade ?? "");
    setUf(location.uf ?? "DF");
    setTipo(location.tipo as LocationType);
    setLat(typeof location.lat === "number" ? location.lat.toString() : "");
    setLng(typeof location.lng === "number" ? location.lng.toString() : "");
  };

  const handleLoadBySigla = async () => {
    setError(null);
    setSuccess(null);

    const code = sigla.trim().toUpperCase();
    if (!code) {
      setError("Informe uma sigla para buscar.");
      return;
    }

    try {
      setIsSubmitting(true);
      const location = await getLocationBySigla(code);

      if (!location) {
        setEditingLocationId(null);
        setError("Nenhum local encontrado com essa sigla.");
        return;
      }

      fillFormFromLocation(location);
      setSuccess("Local carregado para edição.");
    } catch (err: any) {
      console.error(err);
      setEditingLocationId(null);
      setError(err?.message || "Erro ao buscar local pela sigla.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecodePlusCode = () => {
    setError(null);
    setSuccess(null);

    const raw = plusCode.trim();
    if (!raw) {
      setError("Informe um Plus Code para converter.");
      return;
    }

    // Pega apenas o código antes de espaço ou vírgula
    let code = raw.split(/[ ,]/)[0];

    try {
      // Referência pela UF
      const ref = UF_REF_COORDS[uf] ?? UF_REF_COORDS["DF"]; // fallback

      // Se for short code (como 6448+PX), completar usando recoverNearest()
      if (olc.isShort(code)) {
        code = olc.recoverNearest(code, ref.lat, ref.lng);
      }

      // Agora sim validar o código completo
      if (!olc.isValid(code)) {
        setError("Plus Code inválido. Verifique e tente novamente.");
        return;
      }

      const decoded = olc.decode(code);

      setLat(decoded.latitudeCenter.toFixed(6));
      setLng(decoded.longitudeCenter.toFixed(6));
      setSuccess("Coordenadas preenchidas a partir do Plus Code.");
    } catch (e) {
      console.error(e);
      setError("Plus Code inválido. Verifique e tente novamente.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!sigla || !descricao || !cidade || !uf || !tipo) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError("Latitude e longitude devem ser números válidos.");
      return;
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setError("Latitude ou longitude fora da faixa válida.");
      return;
    }

    const payload: LocationInput = {
      sigla: sigla.trim(),
      descricao: descricao.trim(),
      cidade: cidade.trim(),
      uf: uf.trim(),
      tipo,
      lat: latNum,
      lng: lngNum,
    };

    try {
      setIsSubmitting(true);

      if (isEditMode && editingLocationId) {
        await updateLocation(editingLocationId, payload);

        setSuccess("Local atualizado com sucesso.");

        // Limpa tudo e sai do modo edição
        resetForm();
      } else {
        await createLocation(payload);
        setSuccess("Local cadastrado com sucesso.");
        resetForm();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao salvar local.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-semibold text-slate-900 mb-4">
        {isEditMode
          ? "Editar Local Operacional"
          : "Cadastrar Local Operacional"}
      </h1>
      <Button variant="outline" onClick={onBack}>
        Voltar
      </Button>

      <Card className="p-6 space-y-6 mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sigla">Sigla</Label>
              <div className="flex gap-2">
                <Input
                  id="sigla"
                  value={sigla}
                  onChange={(e) => setSigla(e.target.value.toUpperCase())}
                  placeholder="Ex.: GYN-ROD"
                  className="flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadBySigla}
                  disabled={isSubmitting}
                >
                  Buscar
                </Button>
              </div>
              {isEditMode && (
                <p className="text-xs text-amber-700 mt-1">
                  Editando local existente. Ao salvar, as informações serão
                  atualizadas.
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as LocationType)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: RODOVIÁRIA DE GOIÂNIA - GO"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex.: GOIÂNIA"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <select
                id="uf"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {UF_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Geolocalização */}
          <div className="border-t border-slate-200 pt-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Geolocalização
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
              <div className="space-y-2">
                <Label htmlFor="plusCode">
                  Plus Code (opcional – colar do Google Maps)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="plusCode"
                    value={plusCode}
                    onChange={(e) => setPlusCode(e.target.value)}
                    placeholder="Ex.: 3P3X+G5 Goiânia, GO"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDecodePlusCode}
                  >
                    Converter
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="-16.678000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="-49.256000"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <div className="flex items-center gap-2 text-emerald-900 bg-emerald-100 border border-emerald-300 rounded-md px-4 py-3 text-sm font-medium shadow-sm">
              <svg
                className="w-4 h-4 text-emerald-700"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {success}
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-between gap-3 pt-2">
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Novo Local
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting
                ? isEditMode
                  ? "Atualizando..."
                  : "Salvando..."
                : isEditMode
                ? "Salvar Alterações"
                : "Salvar Local"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
