import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
dotenv.config({ path: "mobile/.env", quiet: true });
const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname.split(
  ".",
)[0];
const ownerMode=process.argv.includes('--owner');
const id = ownerMode?'00000000-0000-0000-0000-000000007202':"00000000-0000-0000-0000-000000007201";
const user = {
  id,
  email: "location-qa@example.com",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const token =
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  ) +
  "." +
  Buffer.from(
    JSON.stringify({
      sub: id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 7200,
    }),
  ).toString("base64url") +
  ".bG9jYWwtdWktZml4dHVyZQ";
const session = {
  access_token: token,
  refresh_token: "local-fixture-not-a-real-session",
  token_type: "bearer",
  expires_in: 7200,
  expires_at: Math.floor(Date.now() / 1000) + 7200,
  user,
};
const code = `async(page)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.route('**/auth/v1/**',route=>route.fulfill({json:${JSON.stringify(user)}}));
  await page.route('http://localhost:5000/**',async route=>{
    const url=new URL(route.request().url());
    const response=await route.fetch({url:'http://127.0.0.1:5002'+url.pathname+url.search,headers:{...route.request().headers(),authorization:'Bearer test_token:${id}:location-qa%40example.com'}});
    await route.fulfill({response});
  });
  await page.addInitScript(({project,session,mode})=>{localStorage.setItem('sb-'+project+'-auth-token',JSON.stringify(session));localStorage.setItem('maidaan_active_mode',mode);},${JSON.stringify({ project, session,mode:ownerMode?'HUB_OWNER':'PLAYER' })});
  ${ownerMode?`
  await page.goto('http://localhost:8081/hub/profile',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('textbox',{name:'Venue name',exact:true}).waitFor({timeout:30000});
  const map=page.frameLocator('iframe[title="OpenStreetMap venue map"]');
  await map.locator('.leaflet-interactive').first().waitFor({timeout:60000});
  const before=await page.getByRole('textbox',{name:'Latitude',exact:true}).inputValue();
  await map.locator('#map').click({position:{x:235,y:200}});
  await page.waitForFunction(old=>document.querySelector('input[aria-label="Latitude"]').value!==old,before);
  await page.getByRole('button',{name:'Save venue details',exact:true}).click();
  await page.getByText('Venue details saved.',{exact:true}).waitFor({timeout:30000});
  await page.locator('iframe[title="OpenStreetMap venue map"]').screenshot({path:'output/openstreetmap-owner-pin.png'});
  `:`
  await page.goto('http://localhost:8081/hubs',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByText('Gulberg QA Arena',{exact:true}).waitFor({timeout:60000});
  await page.getByRole('textbox',{name:'Search area',exact:true}).fill('Johar');
  await page.getByText('Johar QA Arena',{exact:true}).waitFor();
  await page.getByText('Gulberg QA Arena',{exact:true}).waitFor({state:'hidden',timeout:30000});
  await page.getByRole('button',{name:'Johar Town',exact:true}).click();
  await page.getByRole('button',{name:'Map',exact:true}).click();
  const map=page.frameLocator('iframe[title="OpenStreetMap venue map"]');
  await map.locator('.leaflet-tile-loaded').first().waitFor({timeout:60000});
  await map.locator('.leaflet-interactive').first().waitFor();
  await page.locator('iframe[title="OpenStreetMap venue map"]').screenshot({path:'output/openstreetmap-venue-pins.png'});
  if(await page.getByRole('button',{name:'Google Maps',exact:true}).count())throw new Error('Provider selector should be hidden');
  const filter=await map.locator('.leaflet-tile-pane').evaluate(el=>getComputedStyle(el).filter);
  if(!filter.includes('invert(1)'))throw new Error('Dark tile styling missing: '+filter);
  await map.locator('.leaflet-interactive').first().click();
  await page.waitForURL(url=>url.pathname==='/hubs/00000000-0000-0000-0000-000000007203',{timeout:30000});
  await page.screenshot({path:'output/location-venue-search-mobile.png',fullPage:true});
  await page.goto('http://localhost:8081/onboarding/player-setup',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('textbox',{name:'Phone number (required)',exact:true}).waitFor({timeout:30000});
  await page.getByRole('textbox',{name:'Home address (required)',exact:true}).fill('House 15, New Colony');
  await page.getByRole('button',{name:'Use this address',exact:true}).click();
  await page.getByRole('textbox',{name:'Phone number (required)',exact:true}).fill('03001234567');
  await page.screenshot({path:'output/location-player-profile-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Finish Setup & Enter Maidaan',exact:true}).click();
  await page.waitForURL(url=>url.pathname.includes('discover'),{timeout:30000});
  await page.goto('http://localhost:8081/profile',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByText('House 15, New Colony',{exact:false}).first().waitFor({timeout:30000});
  await page.getByText('+923001234567',{exact:true}).waitFor();
  await page.goto('http://localhost:8081/hubs?view=map',{waitUntil:'domcontentloaded',timeout:60000});
  const fallbackFrame=page.frameLocator('iframe[title="OpenStreetMap venue map"]');
  await fallbackFrame.locator('.leaflet-tile-loaded').first().waitFor({timeout:30000});
  await fallbackFrame.locator('#map').evaluate(()=>window.parent.postMessage({source:'maidaan-open-map',kind:'error',message:'Simulated map outage'},'*'));
  await page.getByText('OpenStreetMap is unavailable. Using the backup map.',{exact:true}).waitFor();
  await page.getByText('Google Maps is being configured.',{exact:false}).waitFor();
  if(await page.locator('iframe[title="OpenStreetMap venue map"]').count())throw new Error('Primary and backup should not both mount');
  `}
  if(errors.length)throw new Error(errors.join('; '));
}`;
const cli = fs
  .readdirSync(".npm-cache/_npx")
  .map((dir) =>
    path.join(
      ".npm-cache/_npx",
      dir,
      "node_modules/@playwright/cli/playwright-cli.js",
    ),
  )
  .find((file) => fs.existsSync(file));
const result = spawnSync(
  process.execPath,
  [cli, "-s=location-qa", "run-code", code],
  { encoding: "utf8", timeout: 240000, maxBuffer: 3 * 1024 * 1024 },
);
let output = (result.stdout || "") + (result.stderr || "");
output = output.replaceAll(token, "[LOCAL FIXTURE TOKEN]");
console.log(output);
if (result.error) console.error(result.error.message);
process.exitCode = result.error
  ? 1
  : result.status || (/### Error/.test(output) ? 1 : 0);
