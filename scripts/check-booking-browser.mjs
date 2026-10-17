import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
dotenv.config({ path: "mobile/.env", quiet: true });
const fixture = JSON.parse(
  fs.readFileSync("output/.env.hub-verification", "utf8"),
);
const user = fixture.users.find((u) => u.kind === "player");
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const details = process.argv.includes("--details")
  ? process.argv[process.argv.indexOf("--details") + 1]
  : null;
if (details && !/^[a-f\d-]{36}$/i.test(details))
  throw new Error("Invalid booking ID.");
const code = `async(page)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://localhost:8081/hubs',{waitUntil:'domcontentloaded',timeout:60000});
 await page.evaluate(async({url,key,email,password})=>{
  const response=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  if(!response.ok)throw new Error('Temporary browser sign-in failed');
  const session=await response.json();localStorage.clear();localStorage.setItem('sb-'+new URL(url).hostname.split('.')[0]+'-auth-token',JSON.stringify(session));
 },${JSON.stringify({ url, key, email: user.email, password: user.password })});
 ${
   details
     ? `await page.goto('http://localhost:8081/bookings/${details}',{waitUntil:'domcontentloaded',timeout:60000});
 await page.getByText('Payment summary',{exact:true}).waitFor({timeout:30000});
 await page.screenshot({path:'output/booking-confirmed-mobile.png',fullPage:true});`
     : `
 await page.goto('http://localhost:8081/hubs/${fixture.hubId}',{waitUntil:'domcontentloaded',timeout:60000});
 await page.getByRole('button',{name:'Review & book slot',exact:true}).first().waitFor({timeout:60000});
 await page.getByRole('button',{name:'Review & book slot',exact:true}).first().click();
 await page.getByText('Payment choice',{exact:true}).waitFor({timeout:30000});
 await page.getByRole('button',{name:'ADVANCE',exact:true}).click();
 await page.getByText('Due now: PKR 500',{exact:true}).waitFor();
 await page.getByText('Remaining at venue: PKR 1,499.99',{exact:true}).waitFor();
 await page.getByText('Cancellation terms',{exact:true}).waitFor();
 await page.screenshot({path:'output/booking-review-mobile.png',fullPage:true});
 ${
   process.argv.includes("--checkout")
     ? `
 await page.getByRole('button',{name:'I agree to the payment & cancellation terms',exact:true}).click();
 await page.getByRole('button',{name:'Continue to payment',exact:true}).click();
 await page.getByText('Complete sandbox payment',{exact:true}).waitFor({timeout:30000});
 await page.getByRole('button',{name:'Pay with Safepay sandbox',exact:true}).click();
 await page.waitForURL(url=>url.hostname==='sandbox.api.getsafepay.com',{timeout:60000});
 await page.screenshot({path:'output/safepay-checkout.png',fullPage:true});
 `
     : ""
 }
 `
 }
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
if (!cli) throw new Error("Playwright CLI is not installed.");
const result = spawnSync(
  process.execPath,
  [cli, "-s=hub-admin", "run-code", code],
  { encoding: "utf8", timeout: 180000, maxBuffer: 2 * 1024 * 1024 },
);
let output = (result.stdout || "") + (result.stderr || "");
for (const account of fixture.users)
  output = output.replaceAll(account.password, "[REDACTED]");
if (key) output = output.replaceAll(key, "[PUBLIC KEY]");
output = output.replace(
  /https:\/\/sandbox[^\s`"']+/g,
  "[SANDBOX CHECKOUT URL REDACTED]",
);
console.log(output);
if (result.error) console.error(result.error.message);
process.exitCode = result.error
  ? 1
  : result.status || (/### Error/.test(output) ? 1 : 0);
