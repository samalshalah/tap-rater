"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Pause, Play } from "lucide-react";

// The imported shader/component is a byte-identical copy of the approved wave.
const Wave = dynamic(() => import("./Wave"), { ssr: false });
const MotionContext = createContext({ paused: true, toggle: () => {} });

export function PrismaticMotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(media.matches);
    const change = () => setPaused(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return <MotionContext.Provider value={{ paused, toggle: () => setPaused(value => !value) }}>{children}</MotionContext.Provider>;
}

export function PrismaticWave({ variant = "hero" }: { variant?: string }) {
  const { paused, toggle } = useContext(MotionContext);
  return <><Wave paused={paused} variant={variant} /><button type="button" className="tr-motion-toggle" onClick={toggle} aria-label={paused ? "Play wave animation" : "Pause wave animation"}>{paused ? <Play size={14} /> : <Pause size={14} />}<span>{paused ? "Play motion" : "Pause motion"}</span></button></>;
}
