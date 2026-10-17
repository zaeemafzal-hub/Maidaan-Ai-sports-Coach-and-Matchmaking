import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../mobile/services/speechRecognitionService.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadService({ os = 'android', nativeModule = null, speechModule = null } = {}) {
  let packageLoads = 0;
  let probes = 0;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === 'expo') return {
        requireOptionalNativeModule(moduleName) {
          assert.equal(moduleName, 'ExpoSpeechRecognition');
          probes++;
          return nativeModule;
        },
      };
      if (name === 'react-native') return { Platform: { OS: os } };
      if (name === 'expo-speech-recognition') {
        packageLoads++;
        if (!speechModule) throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
        return { ExpoSpeechRecognitionModule: speechModule };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { service: exports.speechRecognitionService, packageLoads: () => packageLoads, probes: () => probes };
}

for (const os of ['android', 'ios']) {
  test(`${os} Expo Go never evaluates the missing native speech package`, async () => {
    const runtime = loadService({ os });
    assert.equal(runtime.packageLoads(), 0);
    assert.equal(await runtime.service.isAvailable(), false);
    assert.equal((await runtime.service.requestPermission()).status, 'unavailable');
    assert.equal((await runtime.service.getPermissionStatus()).status, 'unavailable');
    let error;
    await runtime.service.startListening({ onError: (message) => { error = message; } });
    assert.match(error, /not available/);
    await runtime.service.stopListening();
    await runtime.service.cancelListening();
    assert.equal(runtime.packageLoads(), 0);
    assert.equal(runtime.probes(), 1);
  });
}

test('development builds load the installed recognizer and deliver transcripts', async () => {
  const listeners = new Map();
  let started = false;
  let removed = 0;
  const module = {
    isRecognitionAvailable: () => true,
    requestPermissionsAsync: async () => ({ granted: true, status: 'granted', canAskAgain: true }),
    addListener: (event, callback) => {
      listeners.set(event, callback);
      return { remove: () => { removed++; } };
    },
    start: () => { started = true; listeners.get('start')(); },
    abort: () => {},
  };
  const runtime = loadService({ nativeModule: module, speechModule: module });
  assert.equal(await runtime.service.isAvailable(), true);
  assert.equal((await runtime.service.requestPermission()).granted, true);
  let transcript;
  await runtime.service.startListening({ onFinalResult: (value) => { transcript = value; } });
  assert.equal(started, true);
  assert.equal(runtime.service.isListening, true);
  listeners.get('result')({ isFinal: true, results: [{ transcript: 'Improve my batting' }] });
  assert.equal(transcript, 'Improve my batting');
  await runtime.service.cancelListening();
  assert.equal(runtime.service.isListening, false);
  assert.equal(removed, 4);
  assert.equal(runtime.packageLoads(), 1);
});

test('web uses the browser implementation without probing a native module', async () => {
  const runtime = loadService({ os: 'web', speechModule: { isRecognitionAvailable: () => true } });
  assert.equal(await runtime.service.isAvailable(), true);
  assert.equal(runtime.packageLoads(), 1);
  assert.equal(runtime.probes(), 0);
});
