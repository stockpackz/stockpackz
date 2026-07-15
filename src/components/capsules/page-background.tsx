"use client";

import Image from "next/image";
import { Particles } from "@/components/ui/particles";

export function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#050505]" />

      {/* Generated ambient backdrop — fixed, spans every viewport while scrolling */}
      <Image
        src="/graphics/page-bg-v1.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-80"
      />

      {/* Soft moving atmosphere layered on top */}
      <div className="absolute -top-32 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 animate-pulse bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.045)_0%,transparent_58%)] [animation-duration:8s]" />
      <div className="absolute top-[40%] -right-24 h-[480px] w-[480px] animate-pulse bg-[radial-gradient(circle,rgba(0,200,5,0.06)_0%,transparent_68%)] [animation-duration:10s]" />
      <div className="absolute bottom-[10%] -left-20 h-[420px] w-[420px] animate-pulse bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_70%)] [animation-duration:12s]" />

      <Particles
        className="absolute inset-0 opacity-50"
        quantity={55}
        staticity={35}
        ease={70}
        color="#ffffff"
        size={0.35}
      />

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
    </div>
  );
}
