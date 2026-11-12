import { getProofTable } from "@/lib/proof-table";

export const maxDuration = 120;

/** The proof table: busiest pools of the last ~3,000 blocks, measured. Cached 5 minutes on the server and CDN. */
export async function GET() {
  try {
    const table = await getProofTable();
    return Response.json(table, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : "The chain could not be read.";
    return Response.json({ error: message }, { status: 502 });
  }
}
