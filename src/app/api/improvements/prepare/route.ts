import { z } from "zod";
import { fail, ok, validationFailure } from "@/lib/api/responses";
import { prepareRepositoryChange } from "@/lib/fixes/prepare-repository-change";
import { productionRepositoryChangeDependencies } from "@/lib/fixes/repository-change-adapters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const PrepareChangeSchema = z.object({
  repositoryId: z.string().regex(/^[a-f0-9]{16}$/),
  recommendation: z.string().min(1).max(2_000),
  evidence: z.string().min(1).max(4_000),
  proposal: z.string().min(1).max(12_000),
}).strict();

export async function POST(request: Request) {
  try {
    const input = PrepareChangeSchema.parse(await request.json());
    const prepared = await prepareRepositoryChange(
      input,
      productionRepositoryChangeDependencies,
    );
    return ok(prepared, { published: false });
  } catch (error) {
    if (error instanceof z.ZodError) return validationFailure(error);
    return fail(
      "change_preparation_failed",
      error instanceof Error ? error.message : "Could not prepare the repository change.",
      409,
    );
  }
}
