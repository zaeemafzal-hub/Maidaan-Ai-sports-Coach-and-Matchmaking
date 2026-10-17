// Local verification runner. Temporary credentials are read from an ignored file
// and redacted from CLI output. No credentials are embedded in source control.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
dotenv.config({ path: "mobile/.env", quiet: true });
const fixture = JSON.parse(
  fs.readFileSync("output/.env.hub-verification", "utf8"),
);
const kind = process.argv[2] || "owner";
const user = fixture.users.find((u) => u.kind === kind);
if (!user) throw new Error("Choose owner, player or admin.");
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const route =
  kind === "owner"
    ? "/hub/profile"
    : kind === "admin"
      ? "/admin/accounts"
      : `/hubs/${fixture.hubId}`;
const code = `async (page) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://localhost:8081/hubs',{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(async ({url,key,email,password})=>{
    const response=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!response.ok)throw new Error('Temporary browser sign-in failed');
    const session=await response.json();
    localStorage.clear();localStorage.setItem('sb-'+new URL(url).hostname.split('.')[0]+'-auth-token',JSON.stringify(session));
  },${JSON.stringify({ url, key, email: user.email, password: user.password })});
  await page.goto('http://localhost:8081${route}',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByText(${JSON.stringify(kind === "owner" ? "Make your venue easy to find." : kind === "admin" ? "Manage the Maidaan community." : "Playing spaces & available slots")},{exact:true}).waitFor({timeout:60000});
  ${
    kind === "owner"
      ? `
    await page.getByRole('textbox',{name:'Venue name',exact:true}).waitFor();
    await page.getByRole('textbox',{name:'Venue name',exact:true}).fill('Browser Verified Sports Hub');
    await page.getByRole('button',{name:'Save venue details',exact:true}).click();
    await page.getByText('Venue details saved.',{exact:true}).waitFor({timeout:30000});
    await page.getByRole('button',{name:'Playing spaces & availability',exact:true}).click();
    await page.getByRole('button',{name:'Add playing space',exact:true}).waitFor({timeout:30000});
    await page.getByRole('button',{name:'Add playing space',exact:true}).click();
    await page.getByRole('textbox',{name:'Ground / hall',exact:true}).fill('Ground 2');
    await page.getByRole('textbox',{name:'Pitch / court name',exact:true}).fill('Browser Pitch 2');
    await page.getByRole('button',{name:'Tape-ball',exact:true}).click();
    await page.getByRole('button',{name:'Save playing space',exact:true}).click();
    await page.getByRole('button',{name:'Add slot for Browser Pitch 2',exact:true}).waitFor({timeout:30000});
    await page.getByRole('button',{name:'Add slot for Browser Pitch 2',exact:true}).click();
    await page.getByRole('textbox',{name:'Date (YYYY-MM-DD)',exact:true}).fill('${new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)}');
    await page.getByRole('textbox',{name:'Full-slot price (PKR)',exact:true}).fill('2500');
    await page.getByRole('button',{name:'Save availability slot',exact:true}).click();
    await page.getByText('PKR 2,500 · AVAILABLE',{exact:true}).waitFor({timeout:30000});
  `
      : kind === "player"
        ? `
    await page.getByText('Browser Verified Sports Hub',{exact:true}).first().waitFor({timeout:30000});
    await page.getByText('PKR 2,500',{exact:true}).waitFor({timeout:30000});
    await page.getByRole('button',{name:'Contact venue owner',exact:true}).waitFor();
  `
        : `
    await page.getByRole('textbox',{name:'Search name or email',exact:true}).fill('Verification owner');
    await page.getByRole('button',{name:'Search accounts',exact:true}).click();
    await page.getByRole('button',{name:'Manage Verification owner',exact:true}).click();
    await page.getByRole('button',{name:'Suspend account',exact:true}).waitFor({timeout:30000});
    await page.getByRole('button',{name:'Suspend account',exact:true}).click();
    await page.getByRole('textbox',{name:'Reason (5–500 characters)',exact:true}).fill('Browser verification suspension');
    await page.getByRole('button',{name:'Confirm account change',exact:true}).click();
    await page.getByRole('button',{name:'Reinstate account',exact:true}).waitFor({timeout:30000});
    await page.getByRole('button',{name:'Reinstate account',exact:true}).click();
    await page.getByRole('textbox',{name:'Reason (5–500 characters)',exact:true}).fill('Browser verification reinstatement');
    await page.getByRole('button',{name:'Confirm account change',exact:true}).click();
    await page.getByRole('button',{name:'Suspend account',exact:true}).waitFor({timeout:30000});
  `
  }
  await page.screenshot({path:'output/hub-${kind}-mobile-width.png',fullPage:true});
  console.log('PASS browser ${kind} flow at mobile viewport');
}`;
const cacheRoot = '.npm-cache/_npx';
const cachedCli = fs.existsSync(cacheRoot) ? fs.readdirSync(cacheRoot).map(dir => path.join(cacheRoot, dir, 'node_modules/@playwright/cli/playwright-cli.js')).find(file => fs.existsSync(file)) : undefined;
const cliPath = process.env.PLAYWRIGHT_CLI_PATH || cachedCli;
if (!cliPath) throw new Error('Install @playwright/cli or set PLAYWRIGHT_CLI_PATH before running browser checks.');
const result = spawnSync(
  process.execPath,
  [
    cliPath,
    "-s=hub-admin",
    "run-code",
    code,
  ],
  { encoding: "utf8", timeout: 180000, maxBuffer: 2 * 1024 * 1024 },
);
let output = (result.stdout || "") + (result.stderr || "");
for (const account of fixture.users)
  output = output.replaceAll(account.password, "[REDACTED]");
if (key) output = output.replaceAll(key, "[PUBLIC KEY]");
console.log(output);
if (result.error) console.error(result.error.message);
process.exitCode = result.error ? 1 : (result.status || (/### Error/.test(output) ? 1 : 0));
