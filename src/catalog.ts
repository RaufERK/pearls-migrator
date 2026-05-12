import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { prisma } from './db.js';
import type { Lecture } from './generated/prisma/client.js';
import type { PearlCatalogItem, PearlDocument } from './types.js';

export async function loadPearlCatalog(rootDir: string): Promise<PearlCatalogItem[]> {
  const lectures = await prisma.lecture.findMany({
    orderBy: [
      {
        siteSortDate: 'desc',
      },
      {
        slug: 'desc',
      },
    ],
  });

  return lectures.map((lecture) => toCatalogItem(rootDir, lecture));
}

function toCatalogItem(rootDir: string, lecture: Lecture): PearlCatalogItem {
  const year = lecture.slug.slice(0, 4);
  const path = `/pearls/${year}/${lecture.slug}`;

  return {
    slug: lecture.slug,
    year,
    path,
    jsonPath: resolve(rootDir, lecture.jsonPath),
    sourcePath: resolve(rootDir, lecture.sourcePdf),
    sourceLabel: lecture.sourcePdf,
    title: lecture.title,
    subtitle: toSubtitle(lecture),
    description: lecture.description,
    pages: lecture.pages,
    paragraphs: lecture.paragraphsCount,
    layout: lecture.layout as PearlCatalogItem['layout'],
    downloads: {
      txt: `/downloads/${year}/${lecture.slug}.txt`,
      docx: `/downloads/${year}/${lecture.slug}.docx`,
      epub: `/downloads/${year}/${lecture.slug}.epub`,
    },
  };
}

function toSubtitle(lecture: Lecture): string {
  return [toSitePublicationLabel(lecture), lecture.authorName, lecture.documentTitle]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}

function toSitePublicationLabel(lecture: Lecture): string {
  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];

  if (!lecture.siteMonth) {
    return String(lecture.siteYear);
  }

  return `${monthNames[lecture.siteMonth - 1]} ${lecture.siteYear}`;
}

export async function readPearlDocument(jsonPath: string): Promise<PearlDocument> {
  const source = await readFile(jsonPath, 'utf8');

  return JSON.parse(source) as PearlDocument;
}
