import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
  getImportProviders,
  scrapeMarketplace,
} from "./scrapers/cochesNetScraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dbPath = process.env.DB_PATH ?? path.join(rootDir, "suv30.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    generation TEXT NOT NULL,
    length INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    trunk INTEGER NOT NULL,
    consumption REAL NOT NULL DEFAULT 0,
    ecoLabel TEXT NOT NULL DEFAULT 'C'
  );

  CREATE TABLE IF NOT EXISTS advertisements (
    id TEXT PRIMARY KEY,
    modelId TEXT NOT NULL,
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    year INTEGER NOT NULL,
    km INTEGER NOT NULL,
    fuel TEXT NOT NULL,
    gearbox TEXT NOT NULL,
    horsepower INTEGER NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    seller TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    firstSeen TEXT NOT NULL,
    lastSeen TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (modelId) REFERENCES models(id)
  );
`);

let modelColumns = db.prepare("PRAGMA table_info(models)").all();
const hasColumn = (name) => modelColumns.some((column) => column.name === name);

if (hasColumn("targetPrice") || hasColumn("rating")) {
  db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE models_next (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      generation TEXT NOT NULL,
      length INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 0,
      height INTEGER NOT NULL DEFAULT 0,
      trunk INTEGER NOT NULL,
      consumption REAL NOT NULL DEFAULT 0,
      ecoLabel TEXT NOT NULL DEFAULT 'C'
    );

    INSERT INTO models_next (
      id, brand, model, generation, length, width, height,
      trunk, consumption, ecoLabel
    )
    SELECT
      id, brand, model, generation, length, width, height,
      trunk, consumption, ecoLabel
    FROM models;

    DROP TABLE models;
    ALTER TABLE models_next RENAME TO models;

    PRAGMA foreign_keys = ON;
  `);
  modelColumns = db.prepare("PRAGMA table_info(models)").all();
}

if (!hasColumn("consumption")) {
  db.exec("ALTER TABLE models ADD COLUMN consumption REAL NOT NULL DEFAULT 0");
}

for (const column of ["length", "width", "height"]) {
  if (!hasColumn(column)) {
    db.exec(`ALTER TABLE models ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
  }
}

if (!hasColumn("ecoLabel")) {
  db.exec("ALTER TABLE models ADD COLUMN ecoLabel TEXT NOT NULL DEFAULT 'C'");
}

const updateModelDefaults = db.prepare(`
  UPDATE models
  SET consumption = ?, length = ?, width = ?, height = ?, ecoLabel = ?
  WHERE id = ?
    AND (consumption = 0 OR length = 0 OR width = 0 OR height = 0)
`);

updateModelDefaults.run(6.7, 4510, 1865, 1650, "ECO", "hyundai-tucson-nx4-fl");
updateModelDefaults.run(6.6, 4515, 1865, 1650, "ECO", "kia-sportage-nq5");
updateModelDefaults.run(7.6, 4575, 1845, 1680, "C", "mazda-cx-5-kf");

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

const allowedEcoLabels = new Set(["0", "ECO", "C", "B"]);

const requiredModelFields = [
  "brand",
  "model",
  "generation",
  "length",
  "width",
  "height",
  "trunk",
  "consumption",
  "ecoLabel",
];

const requiredAdvertisementFields = [
  "modelId",
  "title",
  "price",
  "year",
  "km",
  "fuel",
  "gearbox",
  "horsepower",
  "city",
  "province",
  "seller",
  "source",
  "url",
];

const toText = (value) => String(value ?? "").trim();
const toNumber = (value) => Number(value);

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const mapModelInput = (body, id) => ({
  id:
    id ??
    slugify(`${toText(body.brand)}-${toText(body.model)}-${toText(body.generation)}`),
  brand: toText(body.brand),
  model: toText(body.model),
  generation: toText(body.generation),
  length: toNumber(body.length),
  width: toNumber(body.width),
  height: toNumber(body.height),
  trunk: toNumber(body.trunk),
  consumption: toNumber(body.consumption),
  ecoLabel: toText(body.ecoLabel),
});

const mapAdvertisementInput = (body, id, firstSeen) => {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: id ?? `ad-${Date.now()}`,
    modelId: toText(body.modelId),
    title: toText(body.title),
    price: toNumber(body.price),
    year: toNumber(body.year),
    km: toNumber(body.km),
    fuel: toText(body.fuel),
    gearbox: toText(body.gearbox),
    horsepower: toNumber(body.horsepower),
    city: toText(body.city),
    province: toText(body.province),
    seller: toText(body.seller),
    source: toText(body.source),
    url: toText(body.url),
    firstSeen: firstSeen ?? today,
    lastSeen: today,
    notes: toText(body.notes),
  };
};

const insertAdvertisement = (advertisement) =>
  db
    .prepare(
      `
        INSERT INTO advertisements (
          id, modelId, title, price, year, km, fuel, gearbox, horsepower,
          city, province, seller, source, url, firstSeen, lastSeen, notes
        )
        VALUES (
          @id, @modelId, @title, @price, @year, @km, @fuel, @gearbox, @horsepower,
          @city, @province, @seller, @source, @url, @firstSeen, @lastSeen, @notes
        )
      `
    )
    .run(advertisement);

const updateAdvertisement = (advertisement) =>
  db
    .prepare(
      `
        UPDATE advertisements
        SET modelId = @modelId,
            title = @title,
            price = @price,
            year = @year,
            km = @km,
            fuel = @fuel,
            gearbox = @gearbox,
            horsepower = @horsepower,
            city = @city,
            province = @province,
            seller = @seller,
            source = @source,
            url = @url,
            firstSeen = @firstSeen,
            lastSeen = @lastSeen,
            notes = @notes
        WHERE id = @id
      `
    )
    .run(advertisement);

const validateRequiredFields = (body, fields) => {
  const missingFields = fields.filter((field) => toText(body[field]) === "");

  if (missingFields.length > 0) {
    return `Faltan campos obligatorios: ${missingFields.join(", ")}`;
  }

  return null;
};

const validateNumericFields = (body, fields) => {
  for (const field of fields) {
    if (!Number.isFinite(toNumber(body[field]))) {
      return `El campo ${field} debe ser numérico`;
    }
  }

  return null;
};

const validateModelInput = (body) => {
  const missingFieldsError = validateRequiredFields(body, requiredModelFields);

  if (missingFieldsError) {
    return missingFieldsError;
  }

  const numericFieldsError = validateNumericFields(body, [
    "length",
    "width",
    "height",
    "trunk",
    "consumption",
  ]);

  if (numericFieldsError) {
    return numericFieldsError;
  }

  if (!allowedEcoLabels.has(toText(body.ecoLabel))) {
    return "La etiqueta ecológica debe ser 0, ECO, C o B";
  }

  return null;
};

const validateAdvertisementInput = (body) => {
  const missingFieldsError = validateRequiredFields(
    body,
    requiredAdvertisementFields
  );

  if (missingFieldsError) {
    return missingFieldsError;
  }

  const numericFieldsError = validateNumericFields(body, [
    "price",
    "year",
    "km",
    "horsepower",
  ]);

  if (numericFieldsError) {
    return numericFieldsError;
  }

  const modelExists = db
    .prepare("SELECT id FROM models WHERE id = ?")
    .get(toText(body.modelId));

  if (!modelExists) {
    return "El modelo seleccionado no existe";
  }

  return null;
};

const getImportErrorMessage = (error) => {
  const message =
    error instanceof Error ? error.message : "No se ha podido importar desde coches.net";

  if (message.includes("ERR_NETWORK_ACCESS_DENIED")) {
    return "El navegador del importador no tiene acceso a Internet. Si la app la arrancó Codex, inicia `npm run dev` desde tu terminal normal y vuelve a probar.";
  }

  if (message.includes("ERR_NAME_NOT_RESOLVED") || message.includes("ENOTFOUND")) {
    return "No se ha podido resolver coches.net. Revisa la conexión a Internet o el DNS.";
  }

  if (message.includes("Timeout") || message.includes("timeout")) {
    return "coches.net ha tardado demasiado en responder. Prueba con un limite menor o vuelve a intentarlo.";
  }

  if (message.includes("ERR_CERT") || message.includes("CERT_")) {
    return "El navegador del importador ha rechazado el certificado de la web. Revisa certificados/proxy/VPN.";
  }

  return message;
};

const getListingErrorReason = (error) => {
  const message =
    error instanceof Error ? error.message : "No se ha podido leer el anuncio.";

  if (message.includes("ERR_NETWORK_ACCESS_DENIED")) {
    return "Sin acceso de red desde el navegador del importador.";
  }

  if (message.includes("Timeout") || message.includes("timeout")) {
    return "Tiempo de espera agotado al leer el anuncio.";
  }

  return message;
};

app.get("/api/models", (_request, response) => {
  const models = db.prepare("SELECT * FROM models ORDER BY brand, model").all();
  response.json(models);
});

app.post("/api/models", (request, response) => {
  const validationError = validateModelInput(request.body);

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const model = mapModelInput(request.body);
  const modelExists = db.prepare("SELECT id FROM models WHERE id = ?").get(model.id);

  if (modelExists) {
    response
      .status(409)
      .json({ error: "Ya existe un modelo con esa marca, modelo y generación" });
    return;
  }

  db.prepare(
    `
      INSERT INTO models (
        id, brand, model, generation, length, width, height,
        trunk, consumption, ecoLabel
      )
      VALUES (
        @id, @brand, @model, @generation, @length, @width, @height,
        @trunk, @consumption, @ecoLabel
      )
    `
  ).run(model);

  response.status(201).json(model);
});

app.put("/api/models/:id", (request, response) => {
  const id = toText(request.params.id);
  const validationError = validateModelInput(request.body);

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const model = mapModelInput(request.body, id);
  const result = db
    .prepare(
      `
        UPDATE models
        SET brand = @brand,
            model = @model,
            generation = @generation,
            length = @length,
            width = @width,
            height = @height,
            trunk = @trunk,
            consumption = @consumption,
            ecoLabel = @ecoLabel
        WHERE id = @id
      `
    )
    .run(model);

  if (result.changes === 0) {
    response.status(404).json({ error: "Modelo no encontrado" });
    return;
  }

  response.json(model);
});

app.delete("/api/models/:id", (request, response) => {
  const id = toText(request.params.id);
  const linkedAdvertisements = db
    .prepare("SELECT COUNT(*) AS total FROM advertisements WHERE modelId = ?")
    .get(id);

  if (linkedAdvertisements.total > 0) {
    response.status(409).json({
      error: "No se puede borrar un modelo con anuncios asociados",
    });
    return;
  }

  const result = db.prepare("DELETE FROM models WHERE id = ?").run(id);

  if (result.changes === 0) {
    response.status(404).json({ error: "Modelo no encontrado" });
    return;
  }

  response.status(204).send();
});

const importListings = async (request, response, defaultSource = "generic") => {
  const searchUrl = toText(request.body.searchUrl);
  const modelId = toText(request.body.modelId);
  const source = toText(request.body.source) || defaultSource;
  const maxResults = Math.min(Math.max(Number(request.body.maxResults) || 10, 1), 25);

  if (!searchUrl || !modelId) {
    response.status(400).json({ error: "searchUrl y modelId son obligatorios" });
    return;
  }

  let parsedSearchUrl;

  try {
    parsedSearchUrl = new URL(searchUrl);
  } catch {
    response.status(400).json({ error: "La URL de busqueda no es valida" });
    return;
  }

  const modelExists = db.prepare("SELECT id FROM models WHERE id = ?").get(modelId);

  if (!modelExists) {
    response.status(400).json({ error: "El modelo seleccionado no existe" });
    return;
  }

  try {
    const scrapedResult = await scrapeMarketplace({ searchUrl, maxResults, source });
    const summary = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [...scrapedResult.errors],
      results: [],
    };

    for (const listing of scrapedResult.listings) {
      if (listing.status !== "ok") {
        summary.skipped += 1;
        summary.results.push({
          status: listing.status,
          url: listing.url,
          reason: getListingErrorReason(new Error(listing.reason)),
        });
        continue;
      }

      const existingAdvertisement = db
        .prepare("SELECT * FROM advertisements WHERE url = ?")
        .get(listing.advertisement.url);
      const advertisementInput = {
        ...listing.advertisement,
        modelId,
      };
      const validationError = validateAdvertisementInput(advertisementInput);

      if (validationError) {
        summary.skipped += 1;
        summary.results.push({
          status: "skipped",
          url: listing.advertisement.url,
          title: listing.advertisement.title,
          reason: validationError,
        });
        continue;
      }

      if (existingAdvertisement) {
        const advertisement = mapAdvertisementInput(
          {
            ...advertisementInput,
            notes: existingAdvertisement.notes || advertisementInput.notes,
          },
          existingAdvertisement.id,
          existingAdvertisement.firstSeen
        );

        updateAdvertisement(advertisement);
        summary.updated += 1;
        summary.results.push({
          status: "updated",
          id: advertisement.id,
          title: advertisement.title,
          url: advertisement.url,
        });
        continue;
      }

      const advertisement = mapAdvertisementInput(
        advertisementInput,
        `ad-import-${Date.now()}-${summary.imported + summary.updated + 1}`
      );

      insertAdvertisement(advertisement);
      summary.imported += 1;
      summary.results.push({
        status: "imported",
        id: advertisement.id,
        title: advertisement.title,
        url: advertisement.url,
      });
    }

    response.json(summary);
  } catch (error) {
    response.status(502).json({
      error: getImportErrorMessage(error),
    });
  }
};

app.get("/api/import/providers", (_request, response) => {
  response.json(getImportProviders());
});

app.post("/api/import/listings", async (request, response) => {
  await importListings(request, response);
});

app.post("/api/import/cochesnet", async (request, response) => {
  await importListings(request, response, "cochesnet");
});

app.get("/api/advertisements", (_request, response) => {
  const advertisements = db
    .prepare("SELECT * FROM advertisements ORDER BY price ASC")
    .all();

  response.json(advertisements);
});

app.get("/api/advertisements/:id", (request, response) => {
  const advertisement = db
    .prepare("SELECT * FROM advertisements WHERE id = ?")
    .get(toText(request.params.id));

  if (!advertisement) {
    response.status(404).json({ error: "Anuncio no encontrado" });
    return;
  }

  response.json(advertisement);
});

app.post("/api/advertisements", (request, response) => {
  const validationError = validateAdvertisementInput(request.body);

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const advertisement = mapAdvertisementInput(request.body);

  insertAdvertisement(advertisement);

  response.status(201).json(advertisement);
});

app.put("/api/advertisements/:id", (request, response) => {
  const id = toText(request.params.id);
  const currentAdvertisement = db
    .prepare("SELECT * FROM advertisements WHERE id = ?")
    .get(id);

  if (!currentAdvertisement) {
    response.status(404).json({ error: "Anuncio no encontrado" });
    return;
  }

  const validationError = validateAdvertisementInput(request.body);

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const advertisement = mapAdvertisementInput(
    request.body,
    id,
    currentAdvertisement.firstSeen
  );

  updateAdvertisement(advertisement);

  response.json(advertisement);
});

app.delete("/api/advertisements/:id", (request, response) => {
  const result = db
    .prepare("DELETE FROM advertisements WHERE id = ?")
    .run(toText(request.params.id));

  if (result.changes === 0) {
    response.status(404).json({ error: "Anuncio no encontrado" });
    return;
  }

  response.status(204).send();
});

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`SUV30 API running on http://127.0.0.1:${port}`);
});

server.on("error", (error) => {
  console.error(error);
});
