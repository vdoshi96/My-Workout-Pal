import { chromium, webkit, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.argv[2]??'http://localhost:3108';
if(!['http://localhost:3108','https://my-workout-pal-chi.vercel.app'].includes(origin))throw new Error('Unapproved QA origin');
const dir=process.argv[3]??'.impeccable/review';
await mkdir(dir,{recursive:true});
const results=[];
for(const [name,engine,viewport] of [['desktop',chromium,{width:1440,height:1000}],['mobile',webkit,{width:390,height:844}]]) {
 const browser=await engine.launch();
 const context=await browser.newContext({viewport, reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(origin);
  await expect(page.getByRole('heading',{name:'A little space for your next set.'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Try one set',exact:true})).toBeInViewport();
  await page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.getByRole('link',{name:'Try one set',exact:true}).click();
  await page.getByLabel('Repetitions',{exact:true}).fill('10');
  await page.getByRole('button',{name:'Log set & rest',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause timer',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pause timer',exact:true}).click();
  await page.getByRole('button',{name:'Finish practice',exact:true}).click();
  await expect(page.getByRole('link',{name:'Save my routine',exact:true})).toBeVisible();
  await page.screenshot({path:`${dir}/trial-${name}.png`});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.reload();
  await expect(page.getByRole('button',{name:'Log set & rest',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  results.push({name,origin,trial:true,refreshDiscards:true,axeViolations:0,consoleErrors:0});
 } finally {await context.close();await browser.close();}
}
await writeFile(`${dir}/public-result.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
