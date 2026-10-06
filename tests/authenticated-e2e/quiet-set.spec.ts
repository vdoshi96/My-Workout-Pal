import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { answerOnboarding } from "./support/member";

test("blank setup stays empty until selection, then a bodyweight set survives reload and contributes reps", async ({ page, context }, info) => {
  const scope = `quiet-${info.project.name}-${Date.now()}`;
  await context.setExtraHTTPHeaders({"x-mwp-harness-viewer":"alice", "x-mwp-harness-scope":scope, "x-mwp-harness-scenario":"ready"});
  await context.route(/youtube-nocookie\.com/, route => route.fulfill({ status:200, contentType:"text/html", body:"<!doctype html><title>External demo omitted in local QA</title>" }));
  // Chromium exercises forced in-flight cancellation. WebKit's normal reload
  // path is covered without its synthetic routed-request CORS diagnostic.
  let delayFirstSave = info.project.name === "chromium-desktop";
  await context.route(/\/api\/app\/workouts\/[^/]+\/operations$/, async route => {
    if(delayFirstSave) {
      delayFirstSave = false;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    await route.continue().catch(() => undefined);
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let onboardPosts = 0;
  page.on("request", request => { if(request.method() === "POST" && request.url().includes("/profile-program/onboard")) onboardPosts++; });
  try {
    await page.goto("/app");
    await page.getByRole("link", {name:"Library",exact:true}).click();
    await expect(page).toHaveURL(/\/app\/library$/);
    await expect(page.getByRole("heading",{name:"Exercise library",exact:true})).toBeVisible();
    await page.getByRole("link",{name:"Set up your routine",exact:true}).click();
    await page.getByRole("radio", { name:/^Build muscle/ }).check();
    await page.getByRole("button", {name:"Continue"}).click();
    await expect(page.getByText("Step 2 of 5", {exact:false})).toBeVisible();
    expect(onboardPosts).toBe(0);
    await page.getByRole("button", {name:"Back"}).click();
    await answerOnboarding(page, undefined, { navigate: false });
    await page.getByText("Prefer a different start?").click();
    await page.getByRole("button", {name:"Start blank"}).click();
    await page.getByRole("button", {name:"Use kilograms"}).click();
    await expect(page.getByText("Pick your first movement. Nothing is saved until you do.")).toBeVisible();
    expect(onboardPosts).toBe(0);
    await expect(page.getByRole("button", {name:"Save my routine"})).toBeDisabled();
    await page.getByLabel("Search movements").fill("push-up");
    await page.getByRole("button", {name:"Push-up", exact:true}).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:info.outputPath("blank-selected.png"), fullPage:true});
    const created = page.waitForResponse(r=>r.request().method()==="POST" && r.url().includes("/profile-program/onboard"));
    await page.getByRole("button", {name:"Save my routine"}).click();
    expect((await created).status()).toBe(201);
    expect(onboardPosts).toBe(1);
    await expect(page).toHaveURL(/\/app\/program\/edit$/);
    await expect(page.getByRole("heading", {name:"Your routine", exact:true})).toBeVisible();
    await page.getByLabel("Sets", {exact:true}).fill("1");
    await page.getByRole("button", {name:"Save routine", exact:true}).click();
    await expect(page.locator(".pal-editor-save-state")).toHaveText("Saved");
    await page.getByLabel("More actions for Push-up", { exact: true }).click();
    await page.getByRole("button", {name:"Remove Push-up", exact:true}).click();
    await page.getByRole("button", {name:"Remove movement", exact:true}).click();
    await expect(page.getByLabel("Sets", {exact:true})).toHaveCount(0);
    await page.getByRole("button", {name:"Undo removal", exact:true}).click();
    await expect(page.getByLabel("Sets", {exact:true})).toHaveValue("1");
    await expect(page.locator(".pal-editor-save-state")).toHaveText("Saved");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:info.outputPath("routine.png"), fullPage:true});
    await page.getByRole("link", {name:"Today", exact:true}).click();
    const start = page.getByRole("button", {name:"Start Day 1", exact:true});
    await expect(start).toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:info.outputPath("today.png"), fullPage:true});
    await page.getByRole("link", {name:"Library", exact:true}).click();
    await expect(page).toHaveURL(/\/app\/library$/);
    await expect(page.getByRole("link", {name:"Library",exact:true})).toHaveAttribute("aria-current","page");
    await expect(page.getByRole("link", {name:"Routine",exact:true})).not.toHaveAttribute("aria-current","page");
    await expect(page.locator(".pal-scene[data-scene=library] img")).toHaveAttribute("src",/otter-study/);
    await page.screenshot({path:info.outputPath("library.png"),fullPage:true});
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.getByRole("link", {name:"Today",exact:true}).click();
    await page.getByRole("link", {name:"Settings", exact:true}).click();
    await page.getByLabel("Your companion").selectOption("mica");
    await page.getByRole("link", {name:"Today", exact:true}).click();
    await expect(page.locator(".pal-scene[data-scene=mica] img")).toHaveAttribute("src",/mica-studio/);
    await page.screenshot({path:info.outputPath("today-mica.png"),fullPage:true});
    await page.getByRole("link", {name:"Settings", exact:true}).click();
    await page.getByLabel("Your companion").selectOption("pip");
    await page.getByRole("link", {name:"Today", exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await start.click();
    await expect(page).toHaveURL(/\/workout\/[0-9a-f-]+$/);
    await expect(page.getByLabel("Repetitions", {exact:true})).toBeInViewport();
    await expect(page.getByRole("button", {name:"Log set & rest", exact:true})).toBeInViewport();
    await page.getByLabel("Repetitions", {exact:true}).fill("10");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:info.outputPath("runner-first-viewport.png")});
    await page.getByRole("button", {name:"Log set & rest", exact:true}).click();
    await expect(page.getByRole("button", {name:"Pause", exact:true})).toBeVisible();
    await expect(page.getByRole("button", {name:"Finish exercise", exact:true}).first()).toBeEnabled();
    await page.getByRole("button", {name:"Pause", exact:true}).click();
    await page.getByRole("button", {name:"Add 30 seconds", exact:true}).click();
    await page.reload();
    await expect(page.getByLabel("Repetitions", {exact:true})).toHaveValue("10");
    await expect(page.getByRole("button", {name:"Resume", exact:true})).toBeVisible();
    await page.getByRole("button", {name:"Finish exercise", exact:true}).first().click();
    await page.getByRole("button", {name:"Finish workout", exact:true}).click();
    await expect(page).toHaveURL(/\/app\/history\/[0-9a-f-]+\?from=%2Fapp(&done=1)?$/);
    await page.goto("/app/progress");
    await expect(page.getByText("Sets", {exact:true})).toBeVisible();
    await expect(page.getByText("Reps", {exact:true})).toBeVisible();
    await expect(page.locator(".pal-insights-totals")).toContainText("10");
    await expect(page.getByText("Lifted", {exact:true})).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:info.outputPath("progress.png"),fullPage:true});
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.goto("/app/settings");
    await page.getByLabel("Your companion").selectOption("mica");
    await expect(page.locator(".pal-scene[data-scene=settings] img")).toHaveAttribute("src", /hare-prepare/);
    await page.screenshot({path:info.outputPath("settings.png"),fullPage:true});
    await page.emulateMedia({colorScheme:"dark"});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.reload();
    await expect(page.getByLabel("Your companion")).toHaveValue("mica");
    await page.screenshot({path:info.outputPath("settings-dark.png"),fullPage:true});
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.emulateMedia({colorScheme:"light"});
    await page.getByLabel("Your companion").selectOption("off");
    await expect(page.locator(".pal-scene[data-scene=settings]")).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("Your companion")).toHaveValue("off");
    expect(errors).toEqual([]);
  } finally {
    await page.request.delete("/api/harness/scope");
  }
});

for (const scenario of [
  {name:"Front plank", search:"front plank", duration:"30", distance:undefined, total:"30s"},
  {name:"Dumbbell farmer carry", search:"farmer carry", duration:"300", distance:"500", total:"0.5 km"},
]) test(`${scenario.name} records its actual duration or distance without load fields`, async ({page,context},info)=>{
  await context.setExtraHTTPHeaders({"x-mwp-harness-viewer":"alice","x-mwp-harness-scope":`quiet-target-${info.project.name}-${Date.now()}`,"x-mwp-harness-scenario":"ready"});
  await context.route(/youtube-nocookie\.com/,route=>route.fulfill({status:200,body:"<!doctype html><title>External demo omitted</title>"}));
  try {
    await page.goto("/app");
    await answerOnboarding(page, undefined, { navigate: false });
    await page.getByText("Prefer a different start?").click();
    await page.getByRole("button",{name:"Start blank"}).click();
    await page.getByRole("button",{name:"Use kilograms"}).click();
    await page.getByLabel("Search movements").fill(scenario.search);
    await page.getByRole("button",{name:scenario.name,exact:true}).click();
    await page.getByRole("button",{name:"Save my routine",exact:true}).click();
    await expect(page).toHaveURL(/\/app\/program\/edit$/);
    await page.getByLabel("Sets",{exact:true}).fill("1");
    await page.getByRole("button",{name:"Save routine",exact:true}).click();
    await expect(page.locator(".pal-editor-save-state")).toHaveText("Saved");
    if(scenario.distance) {
      await page.evaluate(() => window.scrollTo(0,0));
      await page.screenshot({path:info.outputPath("routine-long-name.png"),fullPage:true});
    }
    await page.getByRole("link",{name:"Today",exact:true}).click();
    await page.getByRole("button",{name:"Start Day 1",exact:true}).click();
    await expect(page.getByLabel("Duration (seconds)",{exact:true})).toBeInViewport();
    await expect(page.getByLabel("Weight (kg)",{exact:true})).toHaveCount(0);
    await page.getByLabel("Duration (seconds)",{exact:true}).fill(scenario.duration);
    if(scenario.distance)await page.getByLabel("Distance (meters)",{exact:true}).fill(scenario.distance);
    await page.getByRole("button",{name:"Log set & rest",exact:true}).click();
    await expect(page.getByRole("button",{name:"Pause",exact:true})).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Duration (seconds)",{exact:true})).toHaveValue(scenario.duration);
    if(scenario.distance)await expect(page.getByLabel("Distance (meters)",{exact:true})).toHaveValue(scenario.distance);
    await page.getByRole("button",{name:"Finish exercise",exact:true}).first().click();
    await page.getByRole("button",{name:"Finish workout",exact:true}).click();
    await expect(page).toHaveURL(/\/app\/history\/[0-9a-f-]+\?from=%2Fapp(&done=1)?$/);
    await page.goto("/app/progress");
    await expect(page.locator(".pal-insights-totals")).toContainText(scenario.total);
    await expect(page.getByText("Lifted",{exact:true})).toHaveCount(0);
  } finally {await page.request.delete("/api/harness/scope");}
});
