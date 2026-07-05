import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

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
    trunk INTEGER NOT NULL,
    targetPrice INTEGER NOT NULL,
    rating TEXT NOT NULL
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

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

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

const mapAdvertisementInput = (body) => {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `ad-${Date.now()}`,
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
    firstSeen: today,
    lastSeen: today,
    notes: toText(body.notes),
  };
};

const validateAdvertisementInput = (body) => {
  const missingFields = requiredAdvertisementFields.filter(
    (field) => toText(body[field]) === ""
  );

  if (missingFields.length > 0) {
    return `Faltan campos obligatorios: ${missingFields.join(", ")}`;
  }

  for (const field of ["price", "year", "km", "horsepower"]) {
    if (!Number.isFinite(toNumber(body[field]))) {
      return `El campo ${field} debe ser numérico`;
    }
  }

  const modelExists = db
    .prepare("SELECT id FROM models WHERE id = ?")
    .get(toText(body.modelId));

  if (!modelExists) {
    return "El modelo seleccionado no existe";
  }

  return null;
};

app.get("/api/models", (_request, response) => {
  const models = db.prepare("SELECT * FROM models ORDER BY brand, model").all();
  response.json(models);
});

app.get("/api/advertisements", (_request, response) => {
  const advertisements = db
    .prepare("SELECT * FROM advertisements ORDER BY price ASC")
    .all();

  response.json(advertisements);
});

app.post("/api/advertisements", (request, response) => {
  const validationError = validateAdvertisementInput(request.body);

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const advertisement = mapAdvertisementInput(request.body);

  db.prepare(
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
  ).run(advertisement);

  response.status(201).json(advertisement);
});

app.listen(port, "127.0.0.1", () => {
  console.log(`SUV30 API running on http://127.0.0.1:${port}`);
});
