import type {ReactNode} from 'react';

/** Stack panels in one grid cell so the tallest tab determines the dialog size.
 * Inactive panels still participate in layout but cannot receive focus or input.
 */
export function DialogTabPanel({active,children,id,labelledBy}:{active:boolean;children:ReactNode;id?:string;labelledBy?:string}){
 return <section id={id} role={labelledBy?'tabpanel':undefined} aria-labelledby={labelledBy} aria-hidden={!active} inert={!active} className="min-w-0 self-start" style={{gridArea:'1 / 1',visibility:active?'visible':'hidden'}}>{children}</section>;
}
