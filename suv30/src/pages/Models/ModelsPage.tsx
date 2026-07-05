import { useEffect, useState } from "react";

import ModelTable from "@/components/ModelTable/ModelTable";
import type { Model } from "@/domain/Model";
import { ModelService } from "@/services/ModelService";

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const service = new ModelService();

    service
      .getModels()
      .then(setModels)
      .catch(() => setError("No se han podido cargar los modelos."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <h1>Modelos</h1>

      {isLoading && <p>Cargando modelos...</p>}
      {error && <p>{error}</p>}
      {!isLoading && !error && <ModelTable models={models} />}
    </>
  );
}
