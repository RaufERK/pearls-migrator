-- CreateTable
CREATE TABLE "Lecture" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentTitle" TEXT,
    "documentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorName" TEXT,
    "authorSlug" TEXT,
    "siteYear" INTEGER NOT NULL,
    "siteMonth" INTEGER,
    "siteMonths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "siteSortDate" TEXT NOT NULL,
    "creationDate" TIMESTAMP(3),
    "creationYear" INTEGER,
    "pearlVolume" INTEGER,
    "pearlIssue" TEXT,
    "pearlDate" TIMESTAMP(3),
    "sourcePdf" TEXT NOT NULL,
    "jsonPath" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "paragraphsCount" INTEGER NOT NULL,
    "layout" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parsedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "Lecture_siteSortDate_idx" ON "Lecture"("siteSortDate");

-- CreateIndex
CREATE INDEX "Lecture_authorSlug_idx" ON "Lecture"("authorSlug");

-- CreateIndex
CREATE INDEX "Lecture_creationYear_idx" ON "Lecture"("creationYear");

-- CreateIndex
CREATE INDEX "Lecture_documentType_idx" ON "Lecture"("documentType");
