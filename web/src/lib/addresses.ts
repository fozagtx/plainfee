import type { Address } from "viem";

/** Mainnet addresses on Robinhood Chain (4663). Mirrors contracts/src/Addresses.sol. */
export const ADDRESSES = {
  wif: "0x5173b8eA6923c2d40267890D45C46a3480954773",
  poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
  positionManager: "0x58daec3116aae6D93017bAAea7749052E8a04fA7",
  stateView: "0xF3334192D15450CdD385c8B70e03f9A6bD9E673b",
  quoter: "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94",
  universalRouter: "0x204FAca1764B154221e35c0d20aBb3c525710498",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
} as const satisfies Record<string, Address>;

/** Plainfee's own contracts. Filled from contracts/deployments/4663.json after deploy. */
export const PLAINFEE = {
  hook: process.env.NEXT_PUBLIC_PLAINFEE_HOOK as Address | undefined,
  vault: process.env.NEXT_PUBLIC_PLAINFEE_VAULT as Address | undefined,
  poolId: process.env.NEXT_PUBLIC_PLAINFEE_POOL_ID as `0x${string}` | undefined,
} as const;

/** The busiest $WIF pool on the chain (Uniswap v4 ETH/WIF). Used as the checker's first example. */
export const MAIN_WIF_POOL_ID = "0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79" as const;
