"use client";
import {useEffect, useState, type ReactNode} from 'react';

// Keep an opened panel mounted so local form state survives tab switches.
export function MountWhenActive({active, children}:{active:boolean;children:ReactNode}) {
  const [visited,setVisited]=useState(active);
  useEffect(()=>{if(active)setVisited(true);},[active]);
  return active||visited?children:null;
}
