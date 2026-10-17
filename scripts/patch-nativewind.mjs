import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// NativeWind's development warning walks React elements and triggers throwing
// navigation-context getters. Log only the identifying props instead.
// https://github.com/nativewind/nativewind/issues/1812
const require = createRequire(import.meta.url);
const nativewindRequire = createRequire(require.resolve('nativewind/package.json'));
const interopRoot = path.dirname(nativewindRequire.resolve('react-native-css-interop/package.json'));
const original = 'stringify(originalProps)';
const replacement = 'stringify({ className: originalProps?.className, testID: originalProps?.testID })';

for (const relativePath of [
  'src/runtime/native/render-component.tsx',
  'dist/runtime/native/render-component.js',
]) {
  const filename = path.join(interopRoot, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  if (source.includes(replacement)) continue;
  if (!source.includes(original)) {
    throw new Error(`NativeWind warning patch no longer matches ${relativePath}. Review the upstream fix before updating this patch.`);
  }
  fs.writeFileSync(filename, source.replace(original, replacement));
}

console.log('Applied NativeWind development-warning compatibility fix.');
