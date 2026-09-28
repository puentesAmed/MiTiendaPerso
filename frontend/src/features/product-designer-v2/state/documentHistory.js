export const DEFAULT_HISTORY_LIMIT = 50;

export function createDocumentHistory(document, limit = DEFAULT_HISTORY_LIMIT) {
  return { past: [], present: document, future: [], limit, lastGroupKey: null };
}

export function pushDocument(history, document, groupKey = null) {
  if (!document || document === history.present) return history;
  if (groupKey && groupKey === history.lastGroupKey) {
    return { ...history, present: document, future: [] };
  }
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: document,
    future: [],
    lastGroupKey: groupKey,
  };
}

export function undoDocument(history) {
  if (!history.past.length) return history;
  const present = history.past.at(-1);
  return {
    ...history,
    past: history.past.slice(0, -1),
    present,
    future: [history.present, ...history.future],
    lastGroupKey: null,
  };
}

export function redoDocument(history) {
  if (!history.future.length) return history;
  const [present, ...future] = history.future;
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present,
    future,
    lastGroupKey: null,
  };
}

