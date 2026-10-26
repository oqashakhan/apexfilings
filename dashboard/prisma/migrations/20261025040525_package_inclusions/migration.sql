-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "includedServices" TEXT[] DEFAULT ARRAY[]::TEXT[];
