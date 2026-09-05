/** Read-only reconciliation. Never changes approval, seeds, or owned data. */
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { createDatabase } from "../src/db/client";
import { catalogExercises, curatedVideos } from "../src/db/schema";
const source = JSON.parse(await readFile(new URL("../docs/video-evidence/inventory.json", import.meta.url),"utf8"));
const mappings = (Array.isArray(source) ? source : source.mappings) as {slug:string;videoId:string;canonicalExerciseSlug?:string}[];
const database=createDatabase();
const rows=await database.select({slug:catalogExercises.slug,videoId:curatedVideos.youtubeVideoId,status:curatedVideos.approvalStatus}).from(curatedVideos).innerJoin(catalogExercises,eq(catalogExercises.id,curatedVideos.exerciseId));
const expected=new Set(mappings.map(row=>`${row.slug??row.canonicalExerciseSlug}:${row.videoId}`));
const actual=new Set(rows.map(row=>`${row.slug}:${row.videoId}`));
const missing=[...expected].filter(key=>!actual.has(key));
const additional=[...actual].filter(key=>!expected.has(key));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,databaseMappings:rows.length,inventoryMappings:mappings.length,approvedRows:rows.filter(row=>row.status==="approved").length,missing,additional,limits:"Database flags describe stored legacy state. They do not independently establish human full viewing."}));
if(missing.length||additional.length)process.exitCode=1;
