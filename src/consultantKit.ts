import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

import { loadCorpusRecords, selectSampleRecords, writeCorpusExport } from './corpusExport.js';
import { AiMetadataSchema, SYSTEM_PROMPT } from './metadataAi.js';
import { anchorId, numberedParagraphs } from './paragraphContract.js';
import type { CorpusRecord } from './corpusRecord.js';

export const CONSULTANT_KIT_DIR = 'consultant-kit';
export const CONSULTANT_KIT_SAMPLE_PEARLS = 5;

export const CONSULTANT_KIT_SOURCES = [
  'src/catalogLabels.ts',
  'src/paragraphContract.ts',
  'src/corpusRecord.ts',
  'src/metadataAi.ts',
  'src/metadataNormalization.ts',
  'src/types.ts',
  'src/word/extractDocxText.ts',
  'src/pdf/extractPdfLines.ts',
  'src/libreOffice.ts',
] as const;

const COPY_HEADER = /^\/\/ скопировано из pearls-migrator, коммит [0-9a-f]+\n\n/u;

export function copiedSource(source: string, commit: string): string {
  return `// скопировано из pearls-migrator, коммит ${commit}\n\n${source.replace(COPY_HEADER, '')}`;
}

export type ParagraphContractCase = {
  source: 'document' | 'assembled-from-real-paragraphs';
  reason: 'separator' | 'triple-newline' | 'trailing-space';
  slug: string;
  position: number;
  content: string;
  paragraphs: Array<{ number: number; anchorId: string; text: string }>;
};

export function selectParagraphContractCases(records: CorpusRecord[]): ParagraphContractCase[] {
  const patterns: Array<{ reason: ParagraphContractCase['reason']; test: (content: string) => boolean }> = [
    { reason: 'separator', test: (content) => /_{3,}|\*{3,}/u.test(content) },
    { reason: 'triple-newline', test: (content) => /\n{3,}/u.test(content) },
    { reason: 'trailing-space', test: (content) => /[ \t](?:\n|$)/u.test(content) },
  ];

  return patterns.map((pattern) => {
    const match = records
      .filter((record) => pattern.test(record.content))
      .sort((left, right) => left.paragraphsCount - right.paragraphsCount)[0];

    if (match) {
      return toCase(match.slug, match.position, match.content, pattern.reason, 'document');
    }

    return assembleCase(records, pattern.reason);
  });
}

export async function buildConsultantKit(rootDir: string, commit: string): Promise<void> {
  const kitDir = resolve(rootDir, CONSULTANT_KIT_DIR);
  const records = await loadCorpusRecords(rootDir);
  const createdAt = new Date();

  for (const relativePath of CONSULTANT_KIT_SOURCES) {
    const source = await readFile(resolve(rootDir, relativePath), 'utf8');
    const destination = resolve(kitDir, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, copiedSource(source, commit));
  }

  await mkdir(resolve(kitDir, 'fixtures'), { recursive: true });
  await writeFile(
    resolve(kitDir, 'fixtures/paragraph-contract.json'),
    `${JSON.stringify({ cases: selectParagraphContractCases(records) }, null, 2)}\n`,
  );
  await writeFile(
    resolve(kitDir, 'fixtures/metadata-contract.json'),
    `${JSON.stringify({
      systemPromptSha256: createHash('sha256').update(SYSTEM_PROMPT).digest('hex'),
      aiMetadataSchema: z.toJSONSchema(AiMetadataSchema),
    }, null, 2)}\n`,
  );

  const corpusDir = resolve(kitDir, 'corpus');
  await writeCorpusExport({ records, directory: corpusDir, createdAt });
  await writeCorpusExport({
    records: selectSampleRecords(records, CONSULTANT_KIT_SAMPLE_PEARLS),
    directory: corpusDir,
    createdAt,
    filePrefix: 'corpus-sample',
  });
  await writeFile(resolve(kitDir, 'README.md'), kitReadme(commit, createdAt));
}

function toCase(
  slug: string,
  position: number,
  content: string,
  reason: ParagraphContractCase['reason'],
  source: ParagraphContractCase['source'],
): ParagraphContractCase {
  return {
    source,
    reason,
    slug,
    position,
    content,
    paragraphs: numberedParagraphs(content).map((paragraph) => ({
      number: paragraph.number,
      anchorId: anchorId(position, paragraph.number),
      text: paragraph.text,
    })),
  };
}

function assembleCase(records: CorpusRecord[], reason: ParagraphContractCase['reason']): ParagraphContractCase {
  const record = [...records].sort((left, right) => left.paragraphsCount - right.paragraphsCount)[0];

  if (!record) {
    throw new Error('Cannot build a paragraph-contract fixture without corpus records');
  }

  const paragraphs = numberedParagraphs(record.content);
  const first = paragraphs[0]?.text ?? 'Абзац';
  const second = paragraphs[1]?.text ?? first;
  let content = `${first}\n\n${second}`;

  if (reason === 'triple-newline') {
    content = `${first}\n\n\n${second}`;
  }

  if (reason === 'trailing-space') {
    content = `${first} \n\n${second}`;
  }

  if (reason === 'separator') {
    content = `${first}\n\n_____\n\n${second}`;
  }

  return toCase(record.slug, record.position, content, reason, 'assembled-from-real-paragraphs');
}

function kitReadme(commit: string, createdAt: Date): string {
  const files = CONSULTANT_KIT_SOURCES.map((path) => `- \`${path}\``).join('\n');

  return `# consultant-kit

Скопировано из pearls-migrator, коммит \`${commit}\`.
Собрано ${createdAt.toISOString()}.

Скопируйте эту папку в \`amasters-ai/vendor/pearls-migrator/\`.

## Файлы

${files}
- \`fixtures/paragraph-contract.json\`
- \`fixtures/metadata-contract.json\`
- \`corpus/\` — полный экспорт и образец из ${CONSULTANT_KIT_SAMPLE_PEARLS} выпусков

## Как обновлять

Пересоберите \`npm run consultant:kit\` и скопируйте папку заново, если изменились \`toBody\`, нумерация абзацев, \`normalizeAuthorDisplayName\`, \`SYSTEM_PROMPT\` или схема метаданных.
`;
}
