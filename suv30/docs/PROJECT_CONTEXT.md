# SUV30 - Contexto del proyecto

## Objetivo
Construir una herramienta personal para encontrar el mejor SUV compacto de ocasión/Km0 para Pau, no una app genérica de mercado.

## Búsqueda
- SUV compacto
- Año 2024, 2025 o 2026
- Precio máximo: 30.000 €
- Km máximos: ideal <40.000, aceptable hasta 50.000
- Potencia mínima: 140/150 CV
- No diésel
- No eléctrico puro
- Gasolina, híbrido, mild hybrid o PHEV aceptados
- Zona prioritaria: Zaragoza, Reus/Tarragona y alrededores
- Radar nacional solo si hay chollo claro
- Prioridades: espacio interior, maletero, bajo consumo, fiabilidad
- Cambio manual o automático indiferente, pero debe registrarse
- Registrar dimensiones: largo, ancho, alto y maletero

## Webs objetivo
- automovilessanchez.es
- carzaocasion.com
- coches.net
- autohero.com
- ocasionplus.com
- flexicar.es

## Automatizacion de datos
El MVP permite importar anuncios de webs objetivo de forma manual asistida:
- El usuario aplica filtros en la web objetivo y copia la URL resultante.
- En Mercado se elige la web, el modelo SUV30 asociado, se pega la URL y se indica un limite de anuncios.
- La API local usa Playwright para leer la pagina, visitar anuncios y extraer datos basicos.
- Se deduplica por URL: si el anuncio existe se actualiza `lastSeen`; si no existe se crea.
- No se programan tareas automaticas de momento.
- No se intentan saltar captchas, bloqueos o medidas anti-bot.
- Si una web bloquea el acceso automatizado, se debe probar otra fuente o importar desde texto/manual.

Fuentes soportadas inicialmente:
- coches.net
- autohero.com
- ocasionplus.com
- flexicar.es
- automovilessanchez.es
- carzaocasion.com
- generica por URL

La skill local `.codex/skills/suv30-cochesnet-agent` documenta el comportamiento del agente de importacion multi-web y sus criterios.

## Enfoque
No buscamos comprar hoy. Queremos una foto inicial del mercado y detectar oportunidades conforme aparezcan.

La app debe responder:
- Qué modelos encajan mejor
- Qué anuncios merecen mirarse primero
- Qué unidades parecen caras, correctas o chollos
- Qué modelos deben descartarse por fiabilidad, motor o mala relación valor/precio

## Filosofía
- Primero funcionalidad, luego perfección técnica
- No sobreingeniería
- App personal, no SaaS
- React + Vite + TypeScript
- Mini API local Node/Express
- SQLite con better-sqlite3
- React NO accede directamente a SQLite
- La UI llama a `/api/...`

## Conceptos principales

### Modelos
Representan candidatos como:
- Hyundai Tucson
- Kia Sportage
- Mazda CX-5
- Nissan Qashqai
- Ford Kuga
- Skoda Karoq
- Renault Austral
- Toyota Corolla Cross

No modelar generaciones/motores/acabados de forma excesivamente compleja por ahora.

### Mercado
Representa anuncios concretos:
- precio
- km
- año
- ciudad/provincia
- vendedor
- web origen
- URL
- fecha primera vez visto
- fecha última vez visto
- notas

### Dashboard
Debe resumir:
- modelos candidatos
- anuncios encontrados
- precio medio observado
- oportunidades/chollos
- mejores anuncios actuales

## Índices definidos

### Índice de Oportunidad (IO)
Puntuación 0-10 para cada anuncio.

Debe valorar:
- Precio respecto al precio objetivo o precio medio observado
- Kilómetros
- Año
- Potencia
- Cercanía a Zaragoza/Reus
- Fiabilidad del modelo/motor
- Consumo
- Maletero/espacio
- Garantía o vendedor, si se conoce

Interpretación:
- 9.5-10: llamar/comprobar inmediatamente
- 9.0-9.4: oportunidad excelente
- 8.0-8.9: interesante
- 7.0-7.9: correcto pero esperaría
- <7: no prioritario

### Índice de Valor (IV)
Puntuación del modelo, no del anuncio.

Valora:
- espacio por precio
- maletero
- fiabilidad
- consumo
- coste de mantenimiento
- disponibilidad de unidades
- depreciación
- reventa

### Índice de Rareza (IR)
Detecta anuncios poco frecuentes:
- precio claramente por debajo de lo habitual
- pocos km
- buena versión
- aparece pocas veces una configuración similar

Sirve para el Radar de Chollos.

### Índice de Espera (IE)
Indica si merece comprar ya o esperar:
- 10: comprar ya si todo cuadra
- 8: difícil mejorar
- 5: esperaría
- 2: seguro que aparecerán mejores

### Precio Medio Observado (PMO)
No copiar valoración externa. Se calcula con los anuncios vistos por la app.

Debe servir para detectar:
- anuncios caros
- anuncios en precio
- oportunidades
- bajadas de precio

### Radar de Chollos
Lista de anuncios que quizá merecen atención aunque se salgan ligeramente de filtros.

Ejemplos:
- 30.500 € en vez de 30.000 €
- 52.000 km en vez de 50.000
- lejos de Zaragoza/Reus pero con precio excepcional

## Descartes

### Descartes obligatorios
- Motores PureTech: descartados 100%
- Diésel
- Eléctrico puro
- Menos de 140 CV salvo excepción muy justificada
- Más de 30.000 €, salvo Radar de Chollos
- Más de 50.000 km, salvo Radar de Chollos

### Lista de descartes
Debe existir una sección o campo donde registrar:
- modelo/anuncio descartado
- motivo
- fecha
- notas

Ejemplos de motivos:
- motor problemático
- PureTech
- demasiado caro
- demasiados km
- poco maletero
- poca potencia
- mala relación valor/precio
- anuncio sospechoso
- vendedor dudoso

## Modelos inicialmente interesantes
Prioritarios:
- Hyundai Tucson
- Kia Sportage
- Ford Kuga
- Mazda CX-5
- Skoda Karoq
- Renault Austral
- Nissan Qashqai
- Toyota Corolla Cross
- Volkswagen Tiguan si entra en precio

A revisar con cautela:
- MG HS/EHS
- marcas chinas o menos consolidadas, sin descartarlas de entrada

Descartar según motor:
- Peugeot/Citroën/Opel con PureTech

## Datos técnicos importantes
Para cada modelo registrar:
- marca
- modelo
- generación, si es relevante
- años considerados
- largo
- ancho
- alto
- batalla, si está disponible
- maletero
- motores recomendados
- motores a evitar
- consumo aproximado
- potencia
- tipo de cambio
- fiabilidad estimada
- puntos fuertes
- puntos débiles
- precio objetivo
- valoración

## Flujo esperado de la app
1. Buscar anuncios manualmente en webs.
2. Añadir anuncio a la app.
3. La app lo relaciona con un modelo.
4. Calcula IO.
5. Lo compara contra PMO y precio objetivo.
6. Lo clasifica:
   - chollo
   - oportunidad
   - interesante
   - normal
   - descartado
7. Permite revisar lista ordenada por IO.

## MVP
Pantallas:
- Dashboard
- Modelos
- Mercado
- Detalle de modelo
- Configuración

Funcionalidades MVP:
- Ver modelos candidatos
- Ver anuncios encontrados
- Añadir anuncio manualmente
- Calcular IO básico
- Ordenar por IO
- Registrar descartes
- Ver Radar de Chollos

## Estado técnico actual
- React + TypeScript + Vite
- React Router
- CSS Modules
- Layout principal con navegación
- Páginas:
  - Dashboard
  - Models
  - Market
  - Settings
- Componentes:
  - ModelTable
  - StatCard
- Mini API local propuesta:
  - Express
  - CORS
  - better-sqlite3
- DB: `suv30.db`

## Tablas iniciales propuestas

### models
- id TEXT PRIMARY KEY
- brand TEXT
- model TEXT
- generation TEXT
- length INTEGER
- width INTEGER
- height INTEGER
- trunk INTEGER
- consumption REAL
- ecoLabel TEXT

### advertisements
- id TEXT PRIMARY KEY
- modelId TEXT
- title TEXT
- price INTEGER
- year INTEGER
- km INTEGER
- fuel TEXT
- gearbox TEXT
- horsepower INTEGER
- city TEXT
- province TEXT
- seller TEXT
- source TEXT
- url TEXT
- firstSeen TEXT
- lastSeen TEXT
- notes TEXT

## Próximo paso recomendado para Codex
No rehacer arquitectura. Avanzar con cambios pequeños:
1. Hacer que React lea `/api/models`.
2. Hacer que ModelsPage muestre datos desde SQLite.
3. Hacer que MarketPage lea `/api/advertisements`.
4. Añadir formulario simple para crear anuncio.
5. Implementar IO básico.
6. Añadir tabla/listado de descartes.

## Avance implementado
- React ya lee modelos y anuncios desde `/api/...`.
- ModelsPage y MarketPage muestran datos desde SQLite.
- MarketPage permite añadir anuncios manualmente y guardarlos en SQLite.
- El Índice de Oportunidad básico ya se calcula en frontend.
- Mercado se ordena por IO descendente.
- Mercado muestra clasificación: Chollo, Oportunidad, Interesante, Normal o Descartado.
- Dashboard cuenta oportunidades reales y muestra los mejores anuncios actuales.
- Radar de Chollos muestra los anuncios más prometedores.
- Los JSON de semilla se han eliminado. SQLite (`suv30.db`) es la fuente de datos.
- Los modelos guardan consumo estimado (`consumption`, l/100 km) y el IO lo usa para premiar modelos eficientes o penalizar consumos altos.
- ModelsPage permite crear modelos con consumo y medidas (largo x ancho x alto).
- ModelsPage permite borrar modelos si no tienen anuncios asociados.
- MarketPage permite borrar anuncios.
- ModelsPage permite editar modelos existentes.
- MarketPage permite editar anuncios existentes.
- Existe detalle de anuncio en `/market/:id` con datos completos, modelo asociado e IO.
- Los modelos guardan etiqueta ecológica (`0`, `ECO`, `C`, `B`).
