import type {
  ContractAddresses,
  JackpotState,
  MembershipBenefits,
  OddsEntry,
  Opening,
  OpenPackParams,
  Pack,
  StockPackzClientConfig,
  XPProfile,
} from "./types.js";
import type { Address } from "viem";

const WEIGHT_DENOMINATOR = 10_000;

/**
 * Typed client for the StockPackz protocol.
 *
 * ```ts
 * const client = new StockPackzClient({ chain: "robinhood" });
 * const pack = await client.packs.get(1n);
 * const odds = await client.packs.odds(1n);
 * ```
 *
 * Reads are safe anywhere; writes require a connected wallet client.
 * All amounts are bigints in the token's native decimals (USDG: 6).
 */
export class StockPackzClient {
  readonly config: StockPackzClientConfig;
  readonly addresses: ContractAddresses;

  constructor(config: StockPackzClientConfig) {
    this.config = config;
    this.addresses = {
      ...DEFAULT_ADDRESSES[config.chain === "robinhood" ? "robinhood" : "localhost"],
      ...config.addresses,
    };
  }

  /** Pack configuration, options, and odds. */
  readonly packs = {
    /** Fetch a pack's full configuration and stock options. */
    get: async (packId: bigint): Promise<Pack> => {
      throw new NotDeployedError("packs.get", { packId });
    },

    /** List all active packs. */
    list: async (): Promise<Pack[]> => {
      throw new NotDeployedError("packs.list");
    },

    /** Exact selection odds for a pack, derived from on-chain weights. */
    odds: async (packId: bigint): Promise<OddsEntry[]> => {
      const pack = await this.packs.get(packId);
      return pack.options.map((option) => ({
        token: option.token,
        weight: option.weight,
        probability: option.weight / WEIGHT_DENOMINATOR,
      }));
    },

    /**
     * Open a pack. Approves USDG if needed, submits `openPack`, and returns
     * the opening in its `randomness-requested` state. Use
     * `openings.waitForSettlement` to follow it to completion.
     */
    open: async (params: OpenPackParams): Promise<Opening> => {
      throw new NotDeployedError("packs.open", params);
    },
  };

  /** Opening lifecycle: status, settlement, retry, refunds. */
  readonly openings = {
    get: async (openingId: bigint): Promise<Opening> => {
      throw new NotDeployedError("openings.get", { openingId });
    },

    /** Resolve once the opening reaches a terminal state. */
    waitForSettlement: async (openingId: bigint): Promise<Opening> => {
      throw new NotDeployedError("openings.waitForSettlement", { openingId });
    },

    /** Retry a failed settlement with new slippage bounds. */
    retry: async (openingId: bigint, maxSlippageBps: number): Promise<Opening> => {
      throw new NotDeployedError("openings.retry", { openingId, maxSlippageBps });
    },

    /** Fully refund a failed settlement. */
    refund: async (openingId: bigint): Promise<Opening> => {
      throw new NotDeployedError("openings.refund", { openingId });
    },
  };

  /** Global jackpot vault state. */
  readonly jackpot = {
    get: async (): Promise<JackpotState> => {
      throw new NotDeployedError("jackpot.get");
    },
  };

  /** Membership tier benefits for any wallet. */
  readonly membership = {
    benefitsOf: async (user: Address): Promise<MembershipBenefits> => {
      throw new NotDeployedError("membership.benefitsOf", { user });
    },
  };

  /** XP, levels, and progression. */
  readonly xp = {
    profileOf: async (user: Address): Promise<XPProfile> => {
      throw new NotDeployedError("xp.profileOf", { user });
    },
  };

  /** Collection completion, computed from live wallet balances. */
  readonly collections = {
    progressOf: async (
      user: Address
    ): Promise<{ collectionId: bigint; name: string; owned: number; required: number; complete: boolean }[]> => {
      throw new NotDeployedError("collections.progressOf", { user });
    },
  };
}

/**
 * Contract calls are wired once Robinhood Chain deployment addresses are
 * finalized. The API surface above is stable; only the transport lands later.
 */
export class NotDeployedError extends Error {
  constructor(method: string, params?: unknown) {
    super(
      `StockPackz SDK: \`${method}\` is not wired yet — protocol deployment addresses are pending. ` +
        `Track progress at https://github.com/stockpackz/stockpackz/blob/main/ROADMAP.md` +
        (params ? ` (params: ${JSON.stringify(params, (_, v) => (typeof v === "bigint" ? v.toString() : v))})` : "")
    );
    this.name = "NotDeployedError";
  }
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

const DEFAULT_ADDRESSES: Record<"robinhood" | "localhost", ContractAddresses> = {
  robinhood: {
    stockPackz: ZERO,
    usdg: ZERO,
    membershipTiers: ZERO,
    xpManager: ZERO,
    packCredits: ZERO,
    collectionBadges: ZERO,
    token: ZERO,
  },
  localhost: {
    stockPackz: ZERO,
    usdg: ZERO,
    membershipTiers: ZERO,
    xpManager: ZERO,
    packCredits: ZERO,
    collectionBadges: ZERO,
    token: ZERO,
  },
};
