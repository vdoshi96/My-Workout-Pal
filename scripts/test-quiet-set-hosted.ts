import { chromium, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createDatabase } from "../src/db/client";
import { getFirebaseAdminAuth } from "../src/server/firebase/admin";
import { createHostedAuthQaIdentity, parseHostedAuthQaConfig } from "../src/domain/hosted-auth-qa";
import { deletionJobIsTerminalOrAbsent, exactIdentityCleanup, firebaseUserCount, globalPersistenceDigest, identityIsAbsent, ownerRowCount } from "./lib/hosted-authenticated-media-browser";

const expect = baseExpect.configure({timeout:15000});
if (process.env["MWP_QUIET_SET_HOSTED_APPROVED"] !== "1") throw new Error("Explicit hosted QA approval is required.");
const config = parseHostedAuthQaConfig({...process.env, MWP_HOSTED_AUTH_EXTERNAL_ACCOUNT_APPROVED:"1"});
const auth = getFirebaseAdminAuth();
const database = createDatabase();
const identities = [createHostedAuthQaIdentity(), createHostedAuthQaIdentity()];
const uids: (string | undefined)[] = [];
const countBefore = await firebaseUserCount(auth);
const digestBefore = await globalPersistenceDigest(database);
const evidenceDir = "docs/qa/latest/member-atmosphere/hosted";
await mkdir(evidenceDir,{recursive:true});
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors:string[]=[];
page.on("pageerror", error=>errors.push(error.name));
let stage="identity creation";
let passed=false;
let cleanupConfirmed=false;
let playback="not verified";
let failure:string|undefined;
let diagnostic:string|undefined;
try {
  for(const identity of identities) uids.push((await auth.createUser({email:identity.email,password:identity.password,emailVerified:true,displayName:"Quiet Set QA"})).uid);
  stage="sign in";
  await page.goto(`${config.origin}/sign-in?returnTo=%2Fapp`);
  await page.getByLabel("Email",{exact:true}).fill(identities[0]!.email);
  await page.getByLabel("Password",{exact:true}).fill(identities[0]!.password);
  await page.getByRole("button",{name:"Sign in with email",exact:true}).click();
  await expect(page).toHaveURL(`${config.origin}/app`);
  stage="Library before setup";
  await page.getByRole("link",{name:"Library",exact:true}).click();
  await expect(page).toHaveURL(`${config.origin}/app/library`);
  await page.getByRole("link",{name:"Set up your routine",exact:true}).click();
  stage="blank setup";
  let posts=0;
  page.on("request",r=>{if(r.method()==="POST"&&r.url().includes("/profile-program/onboard"))posts++;});
  await page.getByRole("radio",{name:/Blank routine/}).check();
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  expect(posts).toBe(0);
  await page.getByLabel("Display units").selectOption("metric");
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  expect(posts).toBe(0);
  await expect(page.getByRole("button",{name:"Save routine",exact:true})).toBeDisabled();
  await page.getByLabel("Search movements").fill("push-up");
  await page.getByRole("button",{name:/^Push-up bodyweight/}).click();
  await page.getByRole("button",{name:"Save routine",exact:true}).click();
  await expect(page).toHaveURL(/\/app\/program\/edit$/);
  expect(posts).toBe(1);
  stage="routine save";
  await page.getByLabel("Sets",{exact:true}).fill("1");
  await page.getByRole("button",{name:"Save routine",exact:true}).click();
  await expect(page.locator(".quiet-save-state")).toHaveText("Saved");
  await page.getByRole("link",{name:"Today",exact:true}).click();
  await expect(page.getByRole("button",{name:"Start workout",exact:true})).toBeInViewport();
  await page.screenshot({path:`${evidenceDir}/today-phone.png`});
  stage="member surface matrix";
  for (const [size,viewport] of [["desktop",{width:1440,height:1000}],["phone",{width:390,height:844}]] as const) {
    await page.setViewportSize(viewport);
    for(const [route,scene] of [["/app","pip-studio"],["/app/program/edit","beaver-plan"],["/app/library?q=push-up","otter-study"],["/app/progress","tortoise-review"],["/app/settings","hare-prepare"]]) {
      await page.goto(`${config.origin}${route}`);
      await expect(page.locator(".member-main")).toBeVisible();
      await expect(page.locator(".member-main .decorative-companion img")).toHaveAttribute("src",new RegExp(scene!));
      await expect(page.locator(".member-main .decorative-companion img")).toBeVisible();
      await expect.poll(()=>page.locator(".member-main .decorative-companion img").evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      await page.screenshot({path:`${evidenceDir}/${route!.split("?")[0]!.replaceAll("/","-").slice(1)}-${size}.png`});
    }
  }
  await page.goto(`${config.origin}/app`);
  stage="start and log";
  await page.getByRole("button",{name:"Start workout",exact:true}).click();
  await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/);
  const sessionId=new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(page.getByLabel("Repetitions",{exact:true})).toBeInViewport();
  await expect(page.getByRole("button",{name:"Log set & rest",exact:true})).toBeInViewport();
  await page.getByLabel("Repetitions",{exact:true}).fill("10");
  await page.screenshot({path:`${evidenceDir}/runner-phone.png`});
  const axe=await new AxeBuilder({page}).exclude("iframe").analyze();
  expect(axe.violations).toEqual([]);
  await page.getByRole("button",{name:"Log set & rest",exact:true}).click();
  await expect(page.getByRole("button",{name:"Pause",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Pause",exact:true}).click();
  await page.getByRole("button",{name:"Add 30 seconds",exact:true}).click();
  stage="reload recovery";
  await page.reload();
  stage="reload: saved repetitions";
  await expect(page.getByLabel("Repetitions",{exact:true})).toHaveValue("10");
  stage="reload: paused timer";
  await expect(page.getByRole("button",{name:"Resume",exact:true})).toBeVisible();
  stage="video and fallback";
  await page.getByText("Watch demo and technique guidance",{exact:true}).click();
  await expect(page.locator('iframe[src*="youtube-nocookie"]')).toHaveCount(1);
  expect(new URL((await page.locator('iframe[src*="youtube-nocookie"]').getAttribute("src"))!).searchParams.get("origin")).toBe(config.origin);
  await expect(page.getByRole("link",{name:"Open on YouTube",exact:true})).toBeVisible();
  try {
    const frame=page.frameLocator('iframe[src*="youtube-nocookie"]');
    await frame.locator(".ytp-large-play-button").click({timeout:12000});
    await expect.poll(async()=>frame.locator("video").evaluate((v:HTMLVideoElement)=>!v.paused&&v.currentTime>0),{timeout:15000}).toBe(true);
    playback="Push-up primary played on production Chromium phone viewport";
  } catch { playback="YouTube playback could not be established; origin, frame, and external fallback verified"; }
  await page.getByText("Watch demo and technique guidance",{exact:true}).click();
  stage="completion";
  await page.getByRole("button",{name:"Complete exercise",exact:true}).first().click();
  await page.getByRole("button",{name:"Complete workout",exact:true}).click();
  await expect(page).toHaveURL(/\/app\/history\/[0-9a-f-]+$/);
  await page.goto(`${config.origin}/app/progress`);
  await expect(page.locator(".progress-totals")).toContainText("10");
  await expect(page.getByText("Volume",{exact:true})).toHaveCount(0);
  await page.screenshot({path:`${evidenceDir}/progress-phone.png`,fullPage:true});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  stage="settings";
  await page.goto(`${config.origin}/app/settings`);
  await page.getByLabel("Your companion").selectOption("off");
  await page.reload();
  await expect(page.getByLabel("Your companion")).toHaveValue("off");
  stage="foreign owner read";
  const other=await browser.newContext();
  try {
    const otherPage=await other.newPage();
    await otherPage.goto(`${config.origin}/sign-in?returnTo=%2Fapp`);
    await otherPage.getByLabel("Email",{exact:true}).fill(identities[1]!.email);
    await otherPage.getByLabel("Password",{exact:true}).fill(identities[1]!.password);
    await otherPage.getByRole("button",{name:"Sign in with email",exact:true}).click();
    await expect(otherPage).toHaveURL(`${config.origin}/app`);
    const foreign=await other.request.get(`${config.origin}/api/app/workouts/${sessionId}`);
    const missing=await other.request.get(`${config.origin}/api/app/workouts/00000000-0000-4000-8000-000000000001`);
    expect(foreign.status()).toBe(404); expect(await foreign.json()).toEqual(await missing.json());
  } finally {await other.close();}
  expect(errors).toEqual([]);
  passed=true;
} catch (error) {
  failure=`Hosted check failed at ${stage}.`;
  if(stage.startsWith("reload")) {
    diagnostic = error instanceof Error ? error.message : "Unknown assertion failure";
    for(const identity of identities) for(const value of [identity.email,identity.password,identity.recoveredPassword]) diagnostic=diagnostic.replaceAll(value,"[redacted]");
    diagnostic=diagnostic.slice(0,2000);
    if(new URL(page.url()).pathname.startsWith("/workout/"))await page.screenshot({path:`${evidenceDir}/failure.png`});
  }
}
finally {
  await context.close(); await browser.close();
  for(let i=0;i<identities.length;i++) uids[i]=await exactIdentityCleanup(auth,database,identities[i]!,uids[i]);
  cleanupConfirmed=await firebaseUserCount(auth)===countBefore && await globalPersistenceDigest(database)===digestBefore;
  for(const uid of uids) if(uid) cleanupConfirmed=cleanupConfirmed && await identityIsAbsent(auth,uid) && await ownerRowCount(database,uid)===0 && await deletionJobIsTerminalOrAbsent(database,uid);
}
const result={checkedAt:new Date().toISOString(),origin:config.origin,passed,stage,cleanupConfirmed,globalStateUnchanged:await globalPersistenceDigest(database)===digestBefore,firebaseCountBefore:countBefore,firebaseCountAfter:await firebaseUserCount(auth),playback,...(failure?{failure}:{})};
await writeFile(`${evidenceDir}/result.json`,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result));
if(diagnostic)console.log(diagnostic);
if(!passed||!cleanupConfirmed)process.exitCode=1;
