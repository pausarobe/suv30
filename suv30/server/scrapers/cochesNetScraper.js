import { chromium } from "playwright";

const DEFAULT_MAX_RESULTS = 10;
const MAX_ALLOWED_RESULTS = 25;

const providers = {
  cochesnet: {
    id: "cochesnet",
    label: "coches.net",
    domains: ["coches.net"],
    sourceName: "coches.net",
    blockedMessage:
      "coches.net ha bloqueado el acceso automatizado y ha mostrado su pagina anti-bot. Prueba con menos resultados, sin VPN/proxy, o importa estos anuncios manualmente.",
    isListingUrl: (path) =>
      path.endsWith(".aspx") &&
      (path.includes("/km-0/") || path.includes("/coches-segunda-mano/")),
  },
  autohero: {
    id: "autohero",
    label: "Autohero",
    domains: ["autohero.com"],
    sourceName: "Autohero",
    isListingUrl: (path) => /\/(es\/)?(auto|car|coches?)\//i.test(path),
  },
  ocasionplus: {
    id: "ocasionplus",
    label: "OcasionPlus",
    domains: ["ocasionplus.com"],
    sourceName: "OcasionPlus",
    isListingUrl: (path) => /\/coches?-segunda-mano\/|\/vehiculo\//i.test(path),
  },
  flexicar: {
    id: "flexicar",
    label: "Flexicar",
    domains: ["flexicar.es"],
    sourceName: "Flexicar",
    isListingUrl: (path) => /\/coches-ocasion\/|\/vehiculo\//i.test(path),
  },
  automovilessanchez: {
    id: "automovilessanchez",
    label: "Automoviles Sanchez",
    domains: ["automovilessanchez.es"],
    sourceName: "Automoviles Sanchez",
    isListingUrl: (path) => /\/vehiculo\/|\/coches\/|\/coches-ocasion\//i.test(path),
  },
  carza: {
    id: "carza",
    label: "Carza Ocasion",
    domains: ["carzaocasion.com"],
    sourceName: "Carza Ocasion",
    isListingUrl: (path) => /\/vehiculo\/|\/coches\//i.test(path),
  },
  generic: {
    id: "generic",
    label: "Web generica",
    domains: [],
    sourceName: "Web externa",
    isListingUrl: (path) =>
      !/\.(jpg|jpeg|png|svg|webp|pdf|css|js)$/i.test(path) &&
      !/\/(login|contacto|privacidad|cookies|aviso-legal|favoritos)/i.test(path),
  },
};

const normalizeWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const stripTags = (value) => String(value ?? "").replace(/<[^>]+>/g, " ");

const decodeJsonEscapes = (value) =>
  String(value ?? "")
    .replace(/\\u20ac/gi, " EUR ")
    .replace(/\\u00a0/gi, " ")
    .replace(/\\n|\\r|\\t/g, " ");

const normalizeText = (value) => normalizeWhitespace(decodeJsonEscapes(stripTags(value)));

export const getImportProviders = () =>
  Object.values(providers).map(({ id, label, domains }) => ({ id, label, domains }));

const getProvider = (source, searchUrl) => {
  const parsedUrl = new URL(searchUrl);
  const selectedProvider = providers[source] ?? providers.generic;

  if (selectedProvider.id !== "generic") {
    return selectedProvider;
  }

  return (
    Object.values(providers).find((provider) =>
      provider.domains.some((domain) => parsedUrl.hostname.includes(domain))
    ) ?? selectedProvider
  );
};

const getBlockedAccessMessage = (provider) =>
  provider.blockedMessage ??
  `${provider.label} ha bloqueado o limitado el acceso automatizado. Prueba con menos resultados o importa estos anuncios manualmente.`;

const isBlockedAccessText = (text) =>
  /parece que algo no va bien|pensar que eres un bot|request id|access denied|forbidden/i.test(
    text
  );

const parseSpanishNumber = (value) => {
  const match = normalizeWhitespace(value).match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)/);

  if (!match) {
    return 0;
  }

  return Number(match[1].replace(/\D/g, ""));
};

const firstNumberFromPatterns = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return parseSpanishNumber(match[1] ?? match[0]);
    }
  }

  return 0;
};

const parsePrice = (text) =>
  firstNumberFromPatterns(text, [
    /"price"\s*:\s*"?(\d{4,6})"?/i,
    /"amount"\s*:\s*"?(\d{4,6})"?/i,
    /"precio"\s*:\s*"?(\d{4,6})"?/i,
    /(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})\s*(?:EUR|€)/i,
  ]);

const parseKm = (text) =>
  firstNumberFromPatterns(text, [
    /"mileage"\s*:\s*"?(\d{1,6})"?/i,
    /"kilometers"\s*:\s*"?(\d{1,6})"?/i,
    /"kilometres"\s*:\s*"?(\d{1,6})"?/i,
    /"kms?"\s*:\s*"?(\d{1,6})"?/i,
    /(\d{1,3}(?:[.\s]\d{3})+|\d{1,6})\s*km\b/i,
  ]);

const parseYear = (text) => {
  const patterns = [
    /"year"\s*:\s*"?((?:20[0-2]\d))"?/i,
    /"registrationYear"\s*:\s*"?((?:20[0-2]\d))"?/i,
    /"firstRegistrationYear"\s*:\s*"?((?:20[0-2]\d))"?/i,
    /(?:Fecha de matriculaci[o\u00f3]n|matriculaci[o\u00f3]n)\s*(20[0-2]\d)/i,
    /\b(20[0-2]\d)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return 0;
};

const parseHorsepower = (text) =>
  firstNumberFromPatterns(text, [
    /"horsepower"\s*:\s*"?(\d{2,3})"?/i,
    /"power"\s*:\s*"?(\d{2,3})"?/i,
    /\b(\d{2,3})\s*(?:cv|c\.v\.)\b/i,
  ]);

const parseFuel = (text) => {
  const labeledFuel = text.match(
    /Combustible\s+(Gasolina|Diesel|Di[e\u00e9]sel|H[i\u00ed]brido ligero|H[i\u00ed]brido|PHEV|El[e\u00e9]ctrico)/i
  );

  if (labeledFuel) {
    const fuel = labeledFuel[1].toLowerCase();

    if (/di/.test(fuel)) return "Diesel";
    if (/el/.test(fuel)) return "Electrico";
    if (/phev/.test(fuel)) return "PHEV";
    if (/ligero/.test(fuel)) return "Hibrido ligero";
    if (/h/.test(fuel)) return "Hibrido";
    return "Gasolina";
  }

  if (/diesel|di[e\u00e9]sel/i.test(text)) {
    return "Diesel";
  }

  if (/el[e\u00e9]ctrico/i.test(text)) {
    return "Electrico";
  }

  if (/phev|h[i\u00ed]brido enchufable/i.test(text)) {
    return "PHEV";
  }

  if (/mild hybrid|h[i\u00ed]brido ligero/i.test(text)) {
    return "Hibrido ligero";
  }

  if (/h[i\u00ed]brido/i.test(text)) {
    return "Hibrido";
  }

  return "Gasolina";
};

const parseGearbox = (text) => {
  const labeledGearbox = text.match(
    /Transmisi[o\u00f3]n\s+(Manual|Autom[a\u00e1]tico|Automatico|DSG)/i
  );

  if (labeledGearbox) {
    return /manual/i.test(labeledGearbox[1]) ? "Manual" : "Automatico";
  }

  return /autom[a\u00e1]tico|automatic|dsg/i.test(text) ? "Automatico" : "Manual";
};

const parseLocation = (text, url) => {
  const knownLocations = [
    ["Zaragoza", "Zaragoza"],
    ["Reus", "Tarragona"],
    ["Tarragona", "Tarragona"],
    ["Barcelona", "Barcelona"],
    ["Madrid", "Madrid"],
    ["Valencia", "Valencia"],
    ["Huesca", "Huesca"],
    ["Lleida", "Lleida"],
    ["Burgos", "Burgos"],
    ["A Coruna", "A Coruna"],
    ["Albacete", "Albacete"],
  ];
  const haystack = `${text} ${url}`.replace(/_/g, " ");
  const location = knownLocations.find(([city, province]) => {
    const pattern = new RegExp(`\\b(${city}|${province})\\b`, "i");
    return pattern.test(haystack);
  });

  if (!location) {
    return { city: "Pendiente", province: "Pendiente" };
  }

  return { city: location[0], province: location[1] };
};

const parseSeller = (text, fallbackSeller) => {
  if (/particular/i.test(text)) {
    return "Particular";
  }

  if (/profesional|concesionario|dealer/i.test(text)) {
    return "Profesional";
  }

  return fallbackSeller;
};

const looksLikeListingUrl = (url, provider, searchUrl) => {
  try {
    const parsedUrl = new URL(url);
    const parsedSearchUrl = new URL(searchUrl);
    const path = parsedUrl.pathname.toLowerCase();
    const allowedDomain =
      provider.id === "generic"
        ? parsedUrl.hostname === parsedSearchUrl.hostname
        : provider.domains.some((domain) => parsedUrl.hostname.includes(domain));

    return allowedDomain && provider.isListingUrl(path);
  } catch {
    return false;
  }
};

const acceptCookies = async (page) => {
  const cookieButton = page
    .getByRole("button", {
      name: /aceptar|accept|consentir|permitir/i,
    })
    .first();

  try {
    await cookieButton.click({ timeout: 4000 });
  } catch {
    // Cookie banners are not guaranteed and should not fail the import.
  }
};

const extractListingUrls = async (page, searchUrl, maxResults, provider) => {
  if (looksLikeListingUrl(searchUrl, provider, searchUrl)) {
    return [searchUrl.split("#")[0]];
  }

  const hrefs = await page.$$eval("a[href]", (links) =>
    links.map((link) => link.getAttribute("href")).filter(Boolean)
  );

  const baseUrl = new URL(searchUrl);
  const urls = hrefs
    .map((href) => new URL(href, baseUrl).toString())
    .filter((url) => looksLikeListingUrl(url, provider, searchUrl))
    .map((url) => url.split("#")[0]);

  return [...new Set(urls)].slice(0, maxResults);
};

const extractPageContent = async (page) =>
  page.evaluate(() => {
    const title =
      document.querySelector("h1")?.textContent ||
      document.querySelector('[data-testid*="title"]')?.textContent ||
      document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      document.title;
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      "";
    const scripts = Array.from(document.scripts)
      .map((script) => script.textContent || "")
      .filter((scriptText) =>
        /price|precio|mileage|kilometers|km|horsepower|registration|202[4-6]/i.test(
          scriptText
        )
      )
      .join(" ");

    return {
      title,
      description,
      text: document.body?.innerText || "",
      scripts,
    };
  });

const getTitleFromUrl = (url) => {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  const slug = parts.at(-1)?.replace(/-\d+-.+\.aspx$/i, "") ?? "";

  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
};

const extractListing = async (page, url, provider) => {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const content = await extractPageContent(page);
  const fullText = normalizeText(
    `${content.title} ${content.description} ${content.text} ${content.scripts}`
  );

  if (isBlockedAccessText(fullText)) {
    return {
      status: "error",
      url,
      reason: getBlockedAccessMessage(provider),
    };
  }

  const title =
    normalizeText(content.title).replace(/\s*\|\s*Coches\.net.*$/i, "") ||
    getTitleFromUrl(url);
  const price = parsePrice(fullText);
  const year = parseYear(fullText);
  const km = parseKm(fullText);
  const horsepower = parseHorsepower(fullText);
  const location = parseLocation(fullText, url);

  const missing = [];

  if (!title) missing.push("titulo");
  if (!price) missing.push("precio");
  if (!year) missing.push("anyo");
  if (!km && !/km-0|nuevo/i.test(url)) missing.push("km");

  if (missing.length > 0) {
    return {
      status: "skipped",
      url,
      reason: `Faltan datos: ${missing.join(", ")}`,
    };
  }

  return {
    status: "ok",
    advertisement: {
      title,
      url,
      price,
      year,
      km,
      fuel: parseFuel(fullText),
      gearbox: parseGearbox(fullText),
      horsepower,
      city: location.city,
      province: location.province,
      seller: parseSeller(fullText, provider.sourceName),
      source: provider.sourceName,
      notes: horsepower
        ? `Importado automaticamente desde ${provider.sourceName}.`
        : `Importado automaticamente desde ${provider.sourceName}. Potencia pendiente de revisar.`,
    },
  };
};

export const scrapeMarketplace = async ({ searchUrl, maxResults, source = "generic" }) => {
  const safeMaxResults = Math.min(
    Math.max(Number(maxResults) || DEFAULT_MAX_RESULTS, 1),
    MAX_ALLOWED_RESULTS
  );
  const provider = getProvider(source, searchUrl);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      locale: "es-ES",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    });

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await acceptCookies(page);
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const searchText = normalizeText(await page.locator("body").innerText().catch(() => ""));

    if (isBlockedAccessText(searchText)) {
      return {
        listings: [],
        errors: [getBlockedAccessMessage(provider)],
      };
    }

    const listingUrls = await extractListingUrls(
      page,
      searchUrl,
      safeMaxResults,
      provider
    );

    if (listingUrls.length === 0) {
      return {
        listings: [],
        errors: [
          `No se han encontrado URLs de anuncios finales para ${provider.label} en la pagina de resultados.`,
        ],
      };
    }

    const listings = [];

    for (const listingUrl of listingUrls) {
      try {
        listings.push(await extractListing(page, listingUrl, provider));
      } catch (error) {
        listings.push({
          status: "error",
          url: listingUrl,
          reason:
            error instanceof Error
              ? error.message
              : "No se ha podido leer el anuncio.",
        });
      }
    }

    return { listings, errors: [] };
  } finally {
    await browser.close();
  }
};

export const scrapeCochesNet = async ({ searchUrl, maxResults }) =>
  scrapeMarketplace({ searchUrl, maxResults, source: "cochesnet" });
