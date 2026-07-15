"use client";

import type { CapsuleType } from "@/lib/types";
import { CapsuleCard } from "./capsule-card";
import { SectionHeader } from "./section-header";

interface CapsuleGridProps {
  capsules: CapsuleType[];
  onSelect: (capsule: CapsuleType) => void;
}

export function CapsuleGrid({ capsules, onSelect }: CapsuleGridProps) {
  return (
    <section id="packs" className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="Packs"
          description="Five curated portfolios. Real companies. One reveal away."
          className="mb-10"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {capsules.map((capsule, index) => (
            <CapsuleCard key={capsule.id} capsule={capsule} index={index} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}
