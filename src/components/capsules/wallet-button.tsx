"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { robinhoodChain } from "@/lib/chain";
import { Button } from "@/components/ui/button";
import { Wallet, AlertTriangle } from "lucide-react";
import { ProfileMenu } from "./profile-menu";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const wrongChain = isConnected && chainId !== robinhoodChain.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {wrongChain && (
          <Button
            size="sm"
            variant="destructive"
            className="h-8 gap-1.5 text-xs"
            onClick={() => switchChain({ chainId: robinhoodChain.id })}
            disabled={isSwitching}
          >
            <AlertTriangle className="h-3 w-3" />
            Switch Network
          </Button>
        )}
        <ProfileMenu address={address} onDisconnect={() => disconnect()} />
      </div>
    );
  }

  const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  return (
    <Button
      size="sm"
      className="h-9 gap-1.5 rounded-full bg-white/[0.08] px-4 text-xs font-medium text-white hover:bg-white/[0.12]"
      onClick={() => injectedConnector && connect({ connector: injectedConnector, chainId: robinhoodChain.id })}
      disabled={isPending || !injectedConnector}
    >
      <Wallet className="h-3.5 w-3.5" />
      {isPending ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}

export function useWalletReady() {
  const { isConnected, chainId } = useAccount();
  return isConnected && chainId === robinhoodChain.id;
}

export { truncateAddress };
