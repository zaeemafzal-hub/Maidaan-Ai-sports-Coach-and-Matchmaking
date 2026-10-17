import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const nativewindRequire = createRequire(require.resolve('nativewind/package.json'));
const interopRoot = path.dirname(nativewindRequire.resolve('react-native-css-interop/package.json'));
const source = fs.readFileSync(path.join(interopRoot, 'dist/runtime/native/render-component.js'), 'utf8');
const warningFunctions = source.slice(source.indexOf('function printUpgradeWarning('), source.indexOf('function getDebugReplacer('));

test('NativeWind upgrade warnings do not inspect React navigation getters', () => {
  let getterCalls = 0;
  const navigationContext = {
    get getKey() {
      getterCalls++;
      throw new Error("Couldn't find a navigation context.");
    },
  };
  const logs = [];
  const context = vm.createContext({ console: { log: (message) => logs.push(message) } });
  vm.runInContext(warningFunctions, context);
  const props = {
    className: 'active:scale-[0.98]',
    testID: 'login-button',
    children: { type: { _currentValue: navigationContext } },
  };

  assert.doesNotThrow(() => context.printUpgradeWarning('CSS variables changed after mounting', props));
  assert.equal(getterCalls, 0);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /CSS variables changed after mounting/);
  assert.match(logs[0], /login-button/);
  assert.match(logs[0], /active:scale/);
});
