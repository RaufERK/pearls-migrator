CREATE INDEX "PearlDocument_full_text_search_idx"
ON "PearlDocument"
USING GIN (
  (
    setweight(to_tsvector('russian', coalesce("authorName", '') || ' ' || coalesce("authorRaw", '')), 'A') ||
    setweight(to_tsvector('russian', coalesce("documentTitle", '') || ' ' || coalesce("description", '')), 'A') ||
    setweight(to_tsvector('russian', coalesce("creationRaw", '')), 'B') ||
    setweight(to_tsvector('russian', coalesce("content", '')), 'C')
  )
);
