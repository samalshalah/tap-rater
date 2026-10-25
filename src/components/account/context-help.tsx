import type {ReactNode} from 'react';
import {WorkspaceDetails} from './workspace-details';
export function ContextHelp({label='About this data',children}:{label?:string;children:ReactNode}){
 return <WorkspaceDetails label={"ⓘ "+label} title={label}>{children}</WorkspaceDetails>;
}
