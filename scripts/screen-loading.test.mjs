import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { create } from "zustand";
const code = (path) =>
  ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
function loading() {
  const exports = {};
  vm.runInNewContext(code("../mobile/store/useScreenLoadingStore.ts"), {
    exports,
    require: () => ({ create }),
  });
  return exports.useScreenLoadingStore;
}
test("screen remains busy until all overlapping requests finish, and finishing is idempotent", () => {
  const store = loading();
  store.getState().setRoute("/discover");
  const a = store.getState().begin(),
    b = store.getState().begin();
  a();
  a();
  assert.equal(Object.values(store.getState().pending).length, 1);
  b();
  assert.equal(Object.values(store.getState().pending).length, 0);
});
test("an old screen request does not block a different route", () => {
  const store = loading();
  store.getState().setRoute("/coach");
  const finish = store.getState().begin();
  store.getState().setRoute("/profile");
  assert.equal(
    Object.values(store.getState().pending).includes("/profile"),
    false,
  );
  finish();
  assert.equal(Object.keys(store.getState().pending).length, 0);
});

test("a focus fetch reads committed navigation before the layout fallback updates", () => {
  const store = loading();
  store.getState().setRoute("old-tab");
  store.getState().setRouteReader(() => "new-tab");
  const finish = store.getState().begin();
  assert.deepEqual(Object.values(store.getState().pending), ["new-tab"]);
  finish();
  store.getState().setRouteReader(null);
});
function apiRuntime(
  store,
  fetch,
  refreshSession = async () => ({ error: "expired" }),
) {
  const exports = {};
  vm.runInNewContext(code("../mobile/services/api.ts"), {
    exports,
    setTimeout,
    clearTimeout,
    AbortController,
    fetch,
    require(name) {
      if (name.includes("backendUrl"))
        return { resolveBackendUrl: () => "https://example.test" };
      if (name === "expo-constants") return { __esModule: true, default: {} };
      if (name === "./storage")
        return { AuthStorage: { getToken: async () => null } };
      if (name.includes("lib/supabase"))
        return {
          isSupabaseConfigured: false,
          supabase: {
            auth: { refreshSession },
          },
        };
      if (name.includes("useScreenLoadingStore"))
        return { useScreenLoadingStore: store };
      throw Error(name);
    },
    process: { env: {} },
  });
  return exports.api;
}
test("request errors and invalid JSON release full-screen loading", async () => {
  const store = loading();
  const api = apiRuntime(store, async () => {
    throw Error("offline");
  });
  const result = await api.get("/matches");
  assert.equal(result.status, 0);
  assert.ok(result.error);
  assert.equal(Object.keys(store.getState().pending).length, 0);
  const malformed = apiRuntime(store, async () => ({
    ok: false,
    status: 502,
    json: async () => {
      throw Error("bad JSON");
    },
  }));
  assert.equal((await malformed.get("/matches")).status, 502);
  assert.equal(Object.keys(store.getState().pending).length, 0);
});
test("request stays busy while response data is being parsed", async () => {
  const store = loading();
  let release;
  const api = apiRuntime(store, async () => ({
    ok: true,
    status: 200,
    json: () =>
      new Promise((done) => {
        release = done;
      }),
  }));
  const request = api.get("/weather");
  await new Promise((done) => setImmediate(done));
  assert.equal(Object.keys(store.getState().pending).length, 1);
  release({ temperature: 24 });
  await request;
  assert.equal(Object.keys(store.getState().pending).length, 0);
});

test("an authentication retry retains its original screen after navigation", async () => {
  const store = loading();
  store.getState().setRoute("/coach");
  let first, last;
  let calls = 0;
  const api = apiRuntime(
    store,
    async () => {
      if (++calls === 1)
        return await new Promise((resolve) => {
          first = resolve;
        });
      return {
        ok: true,
        status: 200,
        json: () =>
          new Promise((resolve) => {
            last = resolve;
          }),
      };
    },
    async () => ({ data: { session: { access_token: "refreshed-fixture" } } }),
  );
  const request = api.get("/history");
  await new Promise((resolve) => setImmediate(resolve));
  store.getState().setRoute("/profile");
  first({ ok: false, status: 401 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.equal(
    Object.values(store.getState().pending).includes("/profile"),
    false,
  );
  last({ messages: [] });
  await request;
  assert.equal(Object.keys(store.getState().pending).length, 0);
});
