-- AlterTable
ALTER TABLE "Lecture" ADD COLUMN     "containedDocs" JSONB NOT NULL DEFAULT '[]';
