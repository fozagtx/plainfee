import { erc20Abi } from "viem";
import { ADDRESSES, PLAINFEE } from "@/lib/addresses";
import { vaultAbi } from "@/lib/plainfee";
import { serverClient } from "@/lib/server-client";

/** Live state for the Ledger Strip. Every figure is read from the chain on request (CDN-cached 4s). */
export async function GET() {
  try {
    const block = await serverClient.getBlock();
    const [supply, burned] = await Promise.all([
      serverClient.readContract({ address: ADDRESSES.wif, abi: erc20Abi, functionName: "totalSupply", blockNumber: block.number }),
      PLAINFEE.vault
        ? serverClient.readContract({ address: PLAINFEE.vault, abi: vaultAbi, functionName: "totalBurned", blockNumber: block.number })
        : Promise.resolve(null),
    ]);
    return Response.json(
      {
        block: block.number.toString(),
        blockTime: Number(block.timestamp),
        wifSupply: supply.toString(),
        wifBurned: burned === null ? null : burned.toString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=4, stale-while-revalidate=10" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : "The chain could not be read.";
    return Response.json({ error: message }, { status: 502 });
  }
}
