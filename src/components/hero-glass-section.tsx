'use client';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@developer-hub/liquid-glass';
import { ArrowRight, Camera } from 'lucide-react';
import Link from 'next/link';

export function HeroGlassSection() {
  return (
    <div className="container mx-auto px-4 md:px-6 flex justify-center animate-fade-in">
      <GlassCard
        shadowMode
        cornerRadius={24}
        padding="24px 24px 28px 24px"
        className="max-w-3xl w-full"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center bg-primary/10 p-4 rounded-full w-fit mb-4 border border-primary/20">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground font-headline">
            IssueSnap
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
            Bridging the gap between citizens and city services through
            AI-powered civic issue reporting. See a problem? Snap it, report
            it, and get it resolved.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/report">
              <Button
                size="lg"
                className="w-full sm:w-auto text-lg py-7 px-8 transition-transform transform hover:scale-105"
              >
                Report an Issue <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
