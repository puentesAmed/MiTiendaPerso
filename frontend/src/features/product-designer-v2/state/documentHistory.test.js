import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentHistory, pushDocument, redoDocument, undoDocument } from "./documentHistory.js";

test("push, undo y redo conservan snapshots y limpian future", () => {
  const first = { revision: 1 };
  const second = { revision: 2 };
  const third = { revision: 3 };
  let history = pushDocument(createDocumentHistory(first, 2), second);
  history = pushDocument(history, third);
  assert.deepEqual(history.past, [first, second]);
  history = undoDocument(history);
  assert.equal(history.present, second);
  history = redoDocument(history);
  assert.equal(history.present, third);
  history = undoDocument(history);
  history = pushDocument(history, { revision: 4 });
  assert.deepEqual(history.future, []);
});

test("groupKey agrupa escritura repetida en una entrada semántica", () => {
  const first = { text: "" };
  let history = pushDocument(createDocumentHistory(first), { text: "a" }, "typing:text-1");
  history = pushDocument(history, { text: "ab" }, "typing:text-1");
  assert.equal(history.past.length, 1);
  assert.equal(undoDocument(history).present, first);
});

