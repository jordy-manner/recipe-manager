-- CreateEnum
CREATE TYPE "ProduceCategory" AS ENUM ('fruits', 'legumes', 'herbes', 'legumineuses');

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "category" "ProduceCategory",
ADD COLUMN     "months" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "ecv" DOUBLE PRECISION,
ADD COLUMN     "ecvSource" TEXT,
ADD COLUMN     "seasonUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

-- CreateIndex
CREATE INDEX "Ingredient_category_idx" ON "Ingredient"("category");
