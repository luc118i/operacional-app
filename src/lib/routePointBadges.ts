import type { RoutePoint } from "@/types/scheme";

export type PointBadge = {
  key: string;
  label: string;
  title: string;
};

export function getRoutePointBadges(p: RoutePoint): PointBadge[] {
  const badges: PointBadge[] = [];

  // TM
  if (p.isDriverChange) {
    badges.push({ key: "TM", label: "TM", title: "Troca de motorista" });
  }

  // AP (apoio)
  if (p.isSupportPoint) {
    badges.push({ key: "AP", label: "AP", title: "Ponto de apoio" });
  }

  // OP (operacional) — só se existir no seu RoutePoint no futuro
  // if ((p as any).isOperationalPoint) {
  //   badges.push({ key: "OP", label: "OP", title: "Ponto operacional" });
  // }

  // LV (parada livre)
  if (p.isFreeStop) {
    badges.push({ key: "LV", label: "LV", title: "Parada livre" });
  }

  // EMB/DES só quando não estiver redundante com o tipo principal
  if (p.isBoardingPoint && p.type !== "PE") {
    badges.push({ key: "EMB", label: "EMB", title: "Embarque" });
  }

  if (p.isDropoffPoint && p.type !== "PD") {
    badges.push({ key: "DES", label: "DES", title: "Desembarque" });
  }

  // DS nunca (decisão sua)
  // if (p.isRestStop && p.type !== "PA") { ... } // não usar

  // Ordem fixa (garantia)
  const order = ["TM", "AP", "OP", "LV", "EMB", "DES"];
  badges.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  return badges;
}
