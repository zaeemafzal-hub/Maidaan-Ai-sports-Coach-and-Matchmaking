import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(
  fs.readFileSync("mobile/components/locations/mapMessages.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const exports = {};
vm.runInNewContext(code, { exports });
test("map messages only select registered pins and accept valid geographic coordinates", () => {
  const selected = [],
    picked = [];
  const props = {
    points: [
      { id: "venue-1", title: "Venue", latitude: 31.52, longitude: 74.35 },
    ],
    onSelect: (id) => selected.push(id),
    onPick: (lat, lng) => picked.push([lat, lng]),
  };
  const receive = (data) =>
    exports.handleMapMessage(
      data,
      props,
      () => {},
      () => {},
    );
  receive({ source: "another-map", kind: "select", id: "venue-1" });
  receive({
    source: "maidaan-open-map",
    kind: "select",
    id: "unregistered-venue",
  });
  receive({
    source: "maidaan-open-map",
    kind: "pick",
    latitude: Infinity,
    longitude: 74,
  });
  receive({
    source: "maidaan-open-map",
    kind: "pick",
    latitude: 31,
    longitude: 200,
  });
  assert.equal(selected.length, 0);
  assert.equal(picked.length, 0);
  receive({ source: "maidaan-open-map", kind: "select", id: "venue-1" });
  receive({
    source: "maidaan-open-map",
    kind: "pick",
    latitude: 31.52,
    longitude: 74.35,
  });
  assert.deepEqual(selected, ["venue-1"]);
  assert.deepEqual(picked, [[31.52, 74.35]]);
});
