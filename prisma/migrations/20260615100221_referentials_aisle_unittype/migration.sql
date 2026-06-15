-- Promote the grocery aisle ("rayon") and the unit family ("type") from free
-- string columns into editable referential tables (Aisle / UnitType), so they
-- can be managed from /parametres and renamed without touching the rows that
-- reference them (the FK follows the id). Data-safe: the tables are seeded with
-- the canonical lists + any value already present, existing rows are backfilled
-- before the old columns are dropped.

-- 1. Referential tables.
CREATE TABLE "Aisle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Aisle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnitType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "UnitType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Aisle_name_key" ON "Aisle"("name");
CREATE UNIQUE INDEX "UnitType_name_key" ON "UnitType"("name");

-- 2. Seed the canonical lists, then any distinct value already in use, so no
--    existing classification is lost during the backfill.
INSERT INTO "Aisle" ("id", "name")
SELECT gen_random_uuid()::text, v
FROM (VALUES
    ('Légume'), ('Fruit'), ('Viande'), ('Poisson'), ('Produit laitier'),
    ('Épicerie'), ('Épice'), ('Herbe'), ('Boisson')
) AS canonical(v)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Aisle" ("id", "name")
SELECT gen_random_uuid()::text, DISTINCT_AISLE."aisle"
FROM (SELECT DISTINCT "aisle" FROM "Ingredient" WHERE "aisle" IS NOT NULL) AS DISTINCT_AISLE
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "UnitType" ("id", "name")
SELECT gen_random_uuid()::text, v
FROM (VALUES
    ('Masse'), ('Volume'), ('Quantité'), ('Cuillère/pincée')
) AS canonical(v)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "UnitType" ("id", "name")
SELECT gen_random_uuid()::text, DISTINCT_KIND."kind"
FROM (SELECT DISTINCT "kind" FROM "Unit" WHERE "kind" IS NOT NULL) AS DISTINCT_KIND
ON CONFLICT ("name") DO NOTHING;

-- 3. Add the FK columns (nullable, like the strings they replace).
ALTER TABLE "Ingredient" ADD COLUMN "aisleId" TEXT;
ALTER TABLE "Unit" ADD COLUMN "typeId" TEXT;

-- 4. Backfill: point each row at the referential row matching its old string.
UPDATE "Ingredient" i
SET "aisleId" = a."id"
FROM "Aisle" a
WHERE i."aisle" = a."name";

UPDATE "Unit" u
SET "typeId" = t."id"
FROM "UnitType" t
WHERE u."kind" = t."name";

-- 5. Drop the now-redundant string columns.
ALTER TABLE "Ingredient" DROP COLUMN "aisle";
ALTER TABLE "Unit" DROP COLUMN "kind";

-- 6. Indexes + foreign keys.
CREATE INDEX "Ingredient_aisleId_idx" ON "Ingredient"("aisleId");
CREATE INDEX "Unit_typeId_idx" ON "Unit"("typeId");

ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_aisleId_fkey" FOREIGN KEY ("aisleId") REFERENCES "Aisle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "UnitType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
