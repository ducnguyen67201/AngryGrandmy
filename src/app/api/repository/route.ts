import { fail, ok } from "@/lib/api/responses";
import {
  getConfiguredRepository,
  getPublicRepositoryMetadata,
} from "@/lib/repository/local-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const repository = await getConfiguredRepository();
    if (!repository) {
      return fail(
        "repository_not_configured",
        "No local repository is connected.",
        503,
      );
    }

    return ok(getPublicRepositoryMetadata(repository), {
      capability: "read-only-investigation",
    });
  } catch {
    return fail(
      "repository_unavailable",
      "The configured local repository could not be opened.",
      503,
    );
  }
}
