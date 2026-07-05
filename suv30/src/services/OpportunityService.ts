import type { Advertisement } from "@/domain/Advertisement";
import type { Model } from "@/domain/Model";
import type {
  OpportunityClassification,
  OpportunityScore,
} from "@/domain/Opportunity";

const priorityLocations = ["zaragoza", "reus", "tarragona"];

export function calculateOpportunityScore(
  advertisement: Advertisement,
  model?: Model
): OpportunityScore {
  const reasons: string[] = [];
  const text = [
    advertisement.title,
    advertisement.fuel,
    advertisement.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  let score = 6;

  if (text.includes("puretech")) {
    reasons.push("Descartar: motor PureTech");
    return buildScore(2, "Descartado", reasons, false);
  }

  if (text.includes("diésel") || text.includes("diesel")) {
    reasons.push("Descartar: diésel");
    return buildScore(2, "Descartado", reasons, false);
  }

  if (text.includes("eléctrico") || text.includes("electrico")) {
    reasons.push("Descartar: eléctrico puro");
    return buildScore(2, "Descartado", reasons, false);
  }

  if (advertisement.horsepower < 140) {
    score -= 2;
    reasons.push("Potencia por debajo de 140 CV");
  } else if (advertisement.horsepower >= 160) {
    score += 0.5;
    reasons.push("Potencia buena");
  } else {
    score += 0.2;
  }

  if (model) {
    const priceGap = model.targetPrice - advertisement.price;

    if (priceGap >= 1500) {
      score += 1.5;
      reasons.push("Precio muy por debajo del objetivo");
    } else if (priceGap >= 0) {
      score += 1;
      reasons.push("Precio dentro del objetivo");
    } else if (advertisement.price <= 30000) {
      score += 0.4;
      reasons.push("Precio por debajo del máximo");
    } else if (advertisement.price <= 30500) {
      score -= 0.2;
      reasons.push("Se pasa poco del presupuesto");
    } else {
      score -= 1.5;
      reasons.push("Precio por encima del presupuesto");
    }

    if (model.trunk >= 580) {
      score += 0.4;
      reasons.push("Maletero amplio");
    } else if (model.trunk >= 520) {
      score += 0.2;
    }

    const consumptionScore = getConsumptionScore(model.consumption);
    score += consumptionScore.score;

    if (consumptionScore.reason) {
      reasons.push(consumptionScore.reason);
    }

    if (model.rating.toLowerCase().includes("recomendable")) {
      score += 0.3;
    }
  } else if (advertisement.price <= 30000) {
    score += 0.4;
    reasons.push("Precio por debajo del máximo");
  }

  if (advertisement.km <= 20000) {
    score += 1;
    reasons.push("Kilómetros bajos");
  } else if (advertisement.km <= 40000) {
    score += 0.6;
    reasons.push("Kilómetros razonables");
  } else if (advertisement.km <= 50000) {
    reasons.push("Kilómetros aceptables");
  } else if (advertisement.km <= 52000) {
    score -= 0.4;
    reasons.push("Se pasa poco de km");
  } else {
    score -= 1.2;
    reasons.push("Demasiados km");
  }

  if (advertisement.year >= 2026) {
    score += 0.8;
    reasons.push("Año 2026");
  } else if (advertisement.year === 2025) {
    score += 0.6;
    reasons.push("Año 2025");
  } else if (advertisement.year === 2024) {
    score += 0.2;
  } else {
    score -= 0.8;
    reasons.push("Año menos prioritario");
  }

  const location = `${advertisement.city} ${advertisement.province}`.toLowerCase();
  if (priorityLocations.some((priority) => location.includes(priority))) {
    score += 0.5;
    reasons.push("Zona prioritaria");
  }

  const roundedScore = clamp(Math.round(score * 10) / 10, 0, 10);
  const classification = classifyAdvertisement(roundedScore);
  const isRadarDeal =
    classification === "Chollo" ||
    classification === "Oportunidad" ||
    (roundedScore >= 7.8 &&
      (advertisement.price <= 30500 || advertisement.km <= 52000));

  return buildScore(roundedScore, classification, reasons, isRadarDeal);
}

export function enrichAdvertisementsWithOpportunity(
  advertisements: Advertisement[],
  models: Model[]
) {
  const modelsById = new Map(models.map((model) => [model.id, model]));

  return advertisements
    .map((advertisement) => ({
      advertisement,
      model: modelsById.get(advertisement.modelId),
      opportunity: calculateOpportunityScore(
        advertisement,
        modelsById.get(advertisement.modelId)
      ),
    }))
    .sort((a, b) => b.opportunity.score - a.opportunity.score);
}

function getConsumptionScore(consumption: number) {
  if (consumption <= 0) {
    return {
      score: 0,
      reason: "",
    };
  }

  if (consumption <= 5.8) {
    return {
      score: 0.8,
      reason: "Consumo muy bueno",
    };
  }

  if (consumption <= 6.6) {
    return {
      score: 0.5,
      reason: "Consumo bueno",
    };
  }

  if (consumption <= 7.2) {
    return {
      score: 0.1,
      reason: "Consumo correcto",
    };
  }

  if (consumption <= 8) {
    return {
      score: -0.4,
      reason: "Consumo algo alto",
    };
  }

  return {
    score: -0.9,
    reason: "Consumo alto",
  };
}

function classifyAdvertisement(score: number): OpportunityClassification {
  if (score >= 9) {
    return "Chollo";
  }

  if (score >= 8) {
    return "Oportunidad";
  }

  if (score >= 7) {
    return "Interesante";
  }

  return "Normal";
}

function buildScore(
  score: number,
  classification: OpportunityClassification,
  reasons: string[],
  isRadarDeal: boolean
): OpportunityScore {
  return {
    score,
    classification,
    reasons,
    isRadarDeal,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
