import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { create } from "zustand";
const transpile = (path) =>
  ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
const palette = {};
vm.runInNewContext(transpile("../mobile/utils/appearancePalette.ts"), {
  exports: palette,
});
test("appearance adapts native neutral colors while retaining layout and brand colors", () => {
  const original = {
    backgroundColor: "#141518",
    color: "#FFFFFF",
    padding: 12,
    transform: [{ translateY: 4 }],
  };
  assert.equal(palette.appearanceStyle(original, false), original);
  const light = palette.appearanceStyle(original, true);
  assert.equal(light.backgroundColor, "#FFFFFF");
  assert.equal(light.color, "#17251D");
  assert.equal(light.padding, 12);
  assert.equal(light.transform, original.transform);
  assert.equal(palette.lightColor("#E85D26", "backgroundColor"), "#E85D26");
  assert.equal(palette.lightColor("#E85D26", "color"), "#A83C12");
  assert.equal(palette.lightColor("#FFFFFF", "color", true), "#FFFFFF");
  assert.equal(
    palette.lightColor("rgba(20,21,24,0.25)", "backgroundColor"),
    "rgba(255,255,255,0.25)",
  );
});
test("web NativeWind color references receive light overrides without losing their CSS layout", () => {
  const css = {
    $$css: true,
    "bg-[#141518]/25 text-white px-4 border-white/[0.08]":
      "bg-[#141518]/25 text-white px-4 border-white/[0.08]",
  };
  const result = palette.appearanceStyle(css, true);
  assert.equal(result[0], css);
  assert.equal(result[1].color, "#17251D");
  assert.equal(result[1].backgroundColor, "rgba(255,255,255,0.25)");
  assert.equal(result[1].borderColor, "rgba(23,37,29,0.12)");
});
test("foreground contrast distinguishes dark surfaces, translucent cards and bright orange buttons", () => {
  assert.equal(
    palette.keepsLightForeground({ backgroundColor: "#141518" }),
    false,
  );
  assert.equal(
    palette.keepsLightForeground({ backgroundColor: "rgba(0,0,0,.7)" }),
    true,
  );
  assert.equal(
    palette.keepsLightForeground({ backgroundColor: "#E85D26" }),
    false,
  );
  assert.equal(
    palette.keepsLightForeground({ backgroundColor: "rgba(20,21,24,.25)" }),
    null,
  );
});
function storeRuntime(storage) {
  const exports = {};
  vm.runInNewContext(transpile("../mobile/store/useAppearanceStore.ts"), {
    exports,
    require(name) {
      if (name === "zustand") return { create };
      if (name === "@react-native-async-storage/async-storage")
        return { __esModule: true, default: storage };
      throw Error(name);
    },
  });
  return exports.useAppearanceStore;
}
test("saved appearance restores and device-following mode tracks system changes", async () => {
  let saved = "light";
  const store = storeRuntime({
    getItem: async () => saved,
    setItem: async (_k, value) => {
      saved = value;
    },
  });
  await store.getState().hydrate();
  assert.equal(store.getState().resolved, "light");
  store.getState().choose("system");
  store.getState().setSystem("dark");
  assert.equal(store.getState().resolved, "dark");
  store.getState().setSystem("light");
  assert.equal(store.getState().resolved, "light");
  assert.equal(saved, "system");
});
test("a slow preference hydration cannot overwrite the user’s newer choice", async () => {
  let resolve;
  const store = storeRuntime({
    getItem: () =>
      new Promise((yes) => {
        resolve = yes;
      }),
    setItem: async () => {},
  });
  const request = store.getState().hydrate();
  store.getState().choose("light");
  resolve("dark");
  await request;
  assert.equal(store.getState().resolved, "light");
});
