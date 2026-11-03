-- PRUEBA FUT-137: migración sin regenerar database.types.ts, se revierte.
alter table public.messages add column deriva_prueba_fut137 text;
