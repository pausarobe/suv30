import { useEffect, useState } from "react";

import StatCard from "@/components/StatCard/StatCard";
import type { Advertisement } from "@/domain/Advertisement";
import type { Model } from "@/domain/Model";
import type { OpportunityScore } from "@/domain/Opportunity";
import { DashboardService } from "@/services/DashboardService";
import {
  getOpportunityGradient,
  getOpportunityTextColor,
} from "@/utils/opportunityStyle";

type RankedAdvertisement = {
  advertisement: Advertisement;
  model?: Model;
  opportunity: OpportunityScore;
};

type Stats = {
  models: number;
  advertisements: number;
  averagePrice: number;
  opportunities: number;
  bestAdvertisements: RankedAdvertisement[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    models: 0,
    advertisements: 0,
    averagePrice: 0,
    opportunities: 0,
    bestAdvertisements: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const service = new DashboardService();

    service
      .getStats()
      .then(setStats)
      .catch(() => setError("No se ha podido cargar el dashboard."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <h1>Dashboard</h1>

      {isLoading && <p>Cargando resumen...</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && (
        <>
          <div style={statsGridStyle}>
            <StatCard title="Modelos" value={stats.models} />

            <StatCard title="Anuncios" value={stats.advertisements} />

            <StatCard
              title="Precio medio"
              value={`${stats.averagePrice.toLocaleString("es-ES")} €`}
            />

            <StatCard title="Chollos" value={stats.opportunities} />
          </div>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Mejores anuncios actuales</h2>

            {stats.bestAdvertisements.length === 0 ? (
              <p>No hay anuncios cargados todavía.</p>
            ) : (
              <div style={listStyle}>
                {stats.bestAdvertisements.map(
                  ({ advertisement, model, opportunity }) => (
                    <article key={advertisement.id} style={itemStyle}>
                      <div style={itemHeaderStyle}>
                        <OpportunityBadge score={opportunity.score} />
                        <strong>{opportunity.classification}</strong>
                      </div>
                      <span>{advertisement.title}</span>
                      <span>
                        {model
                          ? `${model.brand} ${model.model}`
                          : advertisement.modelId}{" "}
                        · {advertisement.price.toLocaleString("es-ES")} € ·{" "}
                        {advertisement.city}
                      </span>
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function OpportunityBadge({ score }: { score: number }) {
  return (
    <span
      style={{
        ...opportunityBadgeStyle,
        background: getOpportunityGradient(score),
        color: getOpportunityTextColor(score),
      }}
    >
      IO {score.toFixed(1)}
    </span>
  );
}

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))",
  gap: "14px",
  marginTop: "18px",
};

const sectionStyle: React.CSSProperties = {
  marginTop: "22px",
  padding: "16px",
  border: "1px solid #dce4ef",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  marginBottom: "10px",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const itemStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  padding: "10px",
  border: "1px solid #edf2f7",
  borderRadius: "6px",
  background: "#f8fafc",
};

const itemHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const opportunityBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "66px",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "0.82rem",
  fontWeight: 800,
  boxShadow: "0 8px 18px rgb(15 23 42 / 14%)",
};
