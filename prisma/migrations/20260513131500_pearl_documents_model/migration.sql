DROP TABLE IF EXISTS "Lecture";

CREATE TABLE "Pearl" (
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "siteLabel" TEXT,
  "siteRawLabel" TEXT,
  "siteYear" INTEGER NOT NULL,
  "siteMonth" INTEGER,
  "siteMonths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "siteSortDate" TEXT NOT NULL,
  "sourcePdf" TEXT NOT NULL,
  "jsonPath" TEXT NOT NULL,
  "pages" INTEGER NOT NULL,
  "layout" TEXT NOT NULL,
  "parsedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Pearl_pkey" PRIMARY KEY ("slug")
);

CREATE TABLE "PearlDocument" (
  "id" TEXT NOT NULL,
  "pearlSlug" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "documentTitle" TEXT,
  "documentType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "authorName" TEXT,
  "authorSlug" TEXT,
  "authorRaw" TEXT,
  "creationDate" TIMESTAMP(3),
  "creationYear" INTEGER,
  "creationRaw" TEXT,
  "pearlVolume" INTEGER,
  "pearlIssue" TEXT,
  "pearlDate" TIMESTAMP(3),
  "pearlRawDate" TEXT,
  "pearlRaw" TEXT,
  "header" JSONB NOT NULL DEFAULT '[]',
  "footer" JSONB NOT NULL DEFAULT '[]',
  "content" TEXT NOT NULL,
  "paragraphsCount" INTEGER NOT NULL,

  CONSTRAINT "PearlDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Pearl_siteSortDate_idx" ON "Pearl"("siteSortDate");
CREATE INDEX "Pearl_siteYear_idx" ON "Pearl"("siteYear");
CREATE UNIQUE INDEX "PearlDocument_pearlSlug_position_key" ON "PearlDocument"("pearlSlug", "position");
CREATE INDEX "PearlDocument_authorSlug_idx" ON "PearlDocument"("authorSlug");
CREATE INDEX "PearlDocument_creationYear_idx" ON "PearlDocument"("creationYear");
CREATE INDEX "PearlDocument_documentType_idx" ON "PearlDocument"("documentType");

ALTER TABLE "PearlDocument"
  ADD CONSTRAINT "PearlDocument_pearlSlug_fkey"
  FOREIGN KEY ("pearlSlug") REFERENCES "Pearl"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
