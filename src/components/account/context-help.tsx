import type {ReactNode} from 'react';
export function ContextHelp({label='About this data',children}:{label?:string;children:ReactNode}){
 return <details className="my-2 text-xs text-muted"><summary className="cursor-pointer w-fit">ⓘ {label}</summary><div className="mt-2 max-w-2xl leading-5">{children}</div></details>;
}
