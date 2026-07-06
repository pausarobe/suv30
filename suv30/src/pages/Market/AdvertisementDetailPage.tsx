import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import type { Advertisement } from "@/domain/Advertisement";
import type { Model } from "@/domain/Model";
import { AdvertisementService } from "@/services/AdvertisementService";
import { ModelService } from "@/services/ModelService";
import { calculateOpportunityScore } from "@/services/OpportunityService";
import {
  getOpportunityGradient,
  getOpportunityTextColor,
} from "@/utils/opportunityStyle";
import { IoMdArrowBack } from "react-icons/io";
import { MdEdit } from "react-icons/md";

const advertisementService = new AdvertisementService();
const modelService = new ModelService();

type SearchCriteriaFailures = {
  price: boolean;
  km: boolean;
  year: boolean;
  horsepower: boolean;
  fuel: boolean;
  trunk: boolean;
  consumption: boolean;
  location: boolean;
};

const emptySearchCriteriaFailures: SearchCriteriaFailures = {
  price: false,
  km: false,
  year: false,
  horsepower: false,
  fuel: false,
  trunk: false,
  consumption: false,
  location: false,
};

export default function AdvertisementDetailPage() {
  const { id } = useParams();
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(
    null,
  );
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const model = useMemo(
    () => models.find((candidate) => candidate.id === advertisement?.modelId),
    [advertisement?.modelId, models],
  );
  const opportunity = advertisement
    ? calculateOpportunityScore(advertisement, model)
    : null;
  const failedCriteria = advertisement
    ? getFailedSearchCriteria(advertisement, model)
    : emptySearchCriteriaFailures;

  useEffect(() => {
    if (!id) {
      return;
    }

    Promise.all([
      advertisementService.getAdvertisement(id),
      modelService.getModels(),
    ])
      .then(([advertisementResponse, modelsResponse]) => {
        setAdvertisement(advertisementResponse);
        setModels(modelsResponse);
      })
      .catch(() => setError("No se ha podido cargar el anuncio."))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <>
      <Link style={backLinkStyle} to="/market">
        <IoMdArrowBack />
        Volver
      </Link>

      {isLoading && <p>Cargando anuncio...</p>}
      {!id && <p>Anuncio no encontrado.</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && advertisement && opportunity && (
        <>
          <div style={headerStyle}>
            <div>
              <h1>{advertisement.title}</h1>
              <p style={mutedTextStyle}>
                {model
                  ? `${model.brand} ${model.model}`
                  : advertisement.modelId}
              </p>
            </div>

            <div style={headerActionsStyle}>
              <Link
                style={editLinkStyle}
                to={`/market?edit=${advertisement.id}`}
              >
                <MdEdit />
              </Link>
              <span
                style={{
                  ...scoreStyle,
                  background: getOpportunityGradient(opportunity.score),
                  color: getOpportunityTextColor(opportunity.score),
                }}
              >
                {opportunity.score.toFixed(1)}
              </span>
            </div>
          </div>

          {advertisement.imageUrl && (
            <img
              alt={advertisement.title}
              src={advertisement.imageUrl}
              style={heroImageStyle}
            />
          )}

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Resumen</h2>
            <div style={gridStyle}>
              <DetailItem
                label="Clasificación"
                value={opportunity.classification}
              />
              <DetailItem
                label="Precio"
                value={`${advertisement.price.toLocaleString("es-ES")} EUR`}
                isInvalid={failedCriteria.price}
              />
              <DetailItem
                label="Kilómetros"
                value={`${advertisement.km.toLocaleString("es-ES")} km`}
                isInvalid={failedCriteria.km}
              />
              <DetailItem
                label="Año"
                value={advertisement.year}
                isInvalid={failedCriteria.year}
              />
              <DetailItem
                label="Potencia"
                value={`${advertisement.horsepower} CV`}
                isInvalid={failedCriteria.horsepower}
              />
              <DetailItem
                label="Combustible"
                value={advertisement.fuel}
                isInvalid={failedCriteria.fuel}
              />
              <DetailItem label="Cambio" value={advertisement.gearbox} />
              <DetailItem
                label="Ubicación"
                value={`${advertisement.city}, ${advertisement.province}`}
                isInvalid={failedCriteria.location}
              />
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Anuncio</h2>
            <div style={gridStyle}>
              <DetailItem label="Vendedor" value={advertisement.seller} />
              <DetailItem label="Web origen" value={advertisement.source} />
              <DetailItem
                label="Primera vez visto"
                value={advertisement.firstSeen}
              />
              <DetailItem
                label="Última vez visto"
                value={advertisement.lastSeen}
              />
              <DetailItem
                label="URL"
                value={
                  advertisement.url && advertisement.url !== "#" ? (
                    <a
                      href={advertisement.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir anuncio
                    </a>
                  ) : (
                    "Sin URL"
                  )
                }
              />
              <DetailItem
                label="Imagen"
                value={
                  advertisement.imageUrl ? (
                    <a
                      href={advertisement.imageUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir imagen
                    </a>
                  ) : (
                    "Sin imagen"
                  )
                }
              />
              <DetailItem
                label="Notas"
                value={advertisement.notes || "Sin notas"}
              />
            </div>
          </section>

          {model && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Modelo asociado</h2>
              <div style={gridStyle}>
                <DetailItem label="Generación" value={model.generation} />
                <DetailItem
                  label="Medidas"
                  value={`${model.length} x ${model.width} x ${model.height} mm`}
                />
                <DetailItem
                  label="Etiqueta ecológica"
                  value={model.ecoLabel || "Pendiente"}
                />
                <DetailItem
                  label="Maletero"
                  value={`${model.trunk} L`}
                  isInvalid={failedCriteria.trunk}
                />
                <DetailItem
                  label="Consumo"
                  value={`${model.consumption.toFixed(1)} l/100 km`}
                  isInvalid={failedCriteria.consumption}
                />
              </div>
            </section>
          )}

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Motivos del IO</h2>
            {opportunity.reasons.length === 0 ? (
              <p>No hay motivos destacados.</p>
            ) : (
              <ul style={reasonsStyle}>
                {opportunity.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

function DetailItem({
  label,
  value,
  isInvalid = false,
}: {
  label: string;
  value: ReactNode;
  isInvalid?: boolean;
}) {
  return (
    <div style={isInvalid ? invalidDetailItemStyle : detailItemStyle}>
      <span style={detailLabelStyle}>{label}</span>
      <strong style={detailValueStyle}>{value}</strong>
    </div>
  );
}

function getFailedSearchCriteria(
  advertisement: Advertisement,
  model?: Model,
): SearchCriteriaFailures {
  const normalizedText = [
    advertisement.title,
    advertisement.fuel,
    advertisement.notes ?? "",
    advertisement.city,
    advertisement.province,
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return {
    price: advertisement.price > 30000,
    km: advertisement.km > 50000,
    year: advertisement.year < 2024,
    horsepower: advertisement.horsepower < 140,
    fuel: /puretech|diesel|electrico/.test(normalizedText),
    trunk: Boolean(model && model.trunk > 0 && model.trunk < 520),
    consumption: Boolean(model && model.consumption > 7.2),
    location: !/zaragoza|reus|tarragona/.test(normalizedText),
  };
}

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "16px",
  color: "#18212f",
  // color: "var(--color-secondary)",
  fontWeight: 600,
  textDecoration: "none",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const editLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  border: "1px solid #dce4ef",
  borderRadius: "7px",
  padding: "8px 10px",
  background: "#ffffff",
  color: "#18212f",
  fontWeight: 800,
  textDecoration: "none",
};

const heroImageStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: "360px",
  marginTop: "16px",
  objectFit: "cover",
  borderRadius: "8px",
  border: "1px solid #dce4ef",
  background: "#f8fafc",
  display: "block",
};

const mutedTextStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#64748b",
};

const scoreStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: 900,
  boxShadow: "0 8px 18px rgb(15 23 42 / 14%)",
};

const sectionStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "16px",
  border: "1px solid #dce4ef",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const sectionTitleStyle: React.CSSProperties = {
  marginBottom: "12px",
  fontSize: "1rem",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))",
  gap: "10px",
};

const detailItemStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px",
  padding: "10px",
  border: "1px solid #edf2f7",
  borderRadius: "7px",
  background: "#f8fafc",
};

const invalidDetailItemStyle: React.CSSProperties = {
  ...detailItemStyle,
  border: "2px solid #dc2626",
  background: "#fff7f7",
};

const detailLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "0.78rem",
  fontWeight: 800,
  textTransform: "uppercase",
};

const detailValueStyle: React.CSSProperties = {
  color: "#0f172a",
  overflowWrap: "anywhere",
};

const reasonsStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
};
