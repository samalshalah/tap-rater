"use client";
import Link from 'next/link';
import {useState,type ComponentProps} from 'react';

type Props=Omit<ComponentProps<typeof Link>,'href'|'prefetch'>&{href:string};

// Keep the initial workspace network free for the page the customer requested.
// Remember the destination, not just a boolean: changing location needs new intent.
export function WorkspaceLink({href,onMouseEnter,onFocus,...props}:Props){
 const [intendedHref,setIntendedHref]=useState<string|null>(null);
 return <Link {...props} href={href} prefetch={intendedHref===href?null:false}
  onMouseEnter={event=>{setIntendedHref(href);onMouseEnter?.(event);}}
  onFocus={event=>{setIntendedHref(href);onFocus?.(event);}}/>;
}
