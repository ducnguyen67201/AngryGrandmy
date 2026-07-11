import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ok, validationFailure } from "@/lib/api/responses";
import { calculateUsabilityReport } from "@/lib/scoring/calculate-report";
import { NormalizedSessionSchema } from "@/lib/schemas/run";
import { FrictionEventSchema } from "@/lib/schemas/run";
export const maxDuration=180;
const FixRequestSchema=z.object({runId:z.string(),sessionId:z.string(),personaId:z.string(),personaName:z.string(),productUrl:z.string().url(),objective:z.string(),frustrationEventId:z.string(),frustration:FrictionEventSchema});

const ReportRequestSchema = z.object({
  sessions: z.array(NormalizedSessionSchema).min(1),
  expectedStepBudgetByPersona: z.record(
    z.string(),
    z.number().int().min(4).max(30),
  ),
});

export async function POST(req: NextRequest) {
  try {
    const raw=await req.json();
    if(req.nextUrl.searchParams.get("fixJob")==="1")return ok(await createFixJob(FixRequestSchema.parse(raw)),{mode:"proposal-only"},{status:202});
    const request = ReportRequestSchema.parse(raw);
    return ok(
      calculateUsabilityReport(
        request.sessions,
        request.expectedStepBudgetByPersona,
      ),
      { mode: "deterministic" },
    );
  } catch (error) {
    return validationFailure(error);
  }
}

async function createFixJob(input:z.infer<typeof FixRequestSchema>){const id=`fix-${input.sessionId}-${input.frustrationEventId}`.replace(/[^a-zA-Z0-9-]/g,"-").slice(0,180),file=path.resolve(process.env.GRANNYSMITH_FIX_JOB_FILE??".grannysmith/fix-jobs.json");let jobs:Record<string,unknown>[]=[];try{jobs=JSON.parse(await fs.readFile(file,"utf8"))}catch{}const existing=jobs.find(j=>j.id===id);if(existing)return existing;const fallback=`${input.frustration.recommendation}\n\nEvidence: ${input.frustration.visibleEvidence}\n\nAdd a regression test for ${input.personaName}.`;const roles=["investigator","fix-proposer"],proposals=process.env.GRANNYSMITH_FIX_AGENT_MODE==="codex"?await Promise.all(roles.map(async role=>({role,details:await runCodex(path.resolve(process.env.GRANNYSMITH_REPO_PATH??process.cwd()),`Act as ${role}. Read only; do not modify, commit, push, or contact external systems. Investigate: ${input.frustration.observation}. Evidence: ${input.frustration.visibleEvidence}. Propose a fix and tests.`)}))):[{role:"fix-proposer",details:fallback}];const job={...input,id,status:"completed",mode:process.env.GRANNYSMITH_FIX_AGENT_MODE==="codex"?"codex":"fallback",proposals,createdAt:new Date().toISOString()};await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify([...jobs,job],null,2),{mode:0o600});return job}
function runCodex(cwd:string,prompt:string):Promise<string>{return new Promise(resolve=>{const child=spawn("codex",["exec","--sandbox","read-only","--ephemeral","--color","never","-c","shell_environment_policy.inherit=none","-C",cwd,"-"],{cwd,shell:false,stdio:["pipe","pipe","ignore"]}),chunks:Buffer[]=[];const timer=setTimeout(()=>{child.kill();resolve("Agent timed out; retry manually.")},120000);child.stdout.on("data",(b:Buffer)=>{if(Buffer.concat(chunks).length<131072)chunks.push(b)});child.on("error",()=>{clearTimeout(timer);resolve("Agent unavailable; retry manually.")});child.on("close",()=>{clearTimeout(timer);resolve(Buffer.concat(chunks).toString().trim()||"No proposal returned.")});child.stdin.end(prompt)})}
