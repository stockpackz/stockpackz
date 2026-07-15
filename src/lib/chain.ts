import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

export const robinhoodChain = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
} as const;

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [robinhoodChain.id]: http("https://rpc.mainnet.chain.robinhood.com"),
  },
  ssr: true,
});
