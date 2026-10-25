import {WorkspaceDetails} from './workspace-details';
import type {ReactNode} from 'react';
export function WorkspaceMetrics({items}:{items:{label:string;value:ReactNode;note?:string}[]}) {
 return <dl className="tr-workspace-metrics">{items.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.note&&<small>{item.note}</small>}</div>)}</dl>;
}
export function WorkspacePageHeader({title,description,actions}:{title:string;description?:string;actions?:ReactNode}) {
 return <header className="tr-app-page-header"><div className="tr-app-title-row"><h1>{title}</h1>{description&&<WorkspaceDetails label="?" title={title+" help"}><p>{description}</p></WorkspaceDetails>}</div>{actions&&<div className="tr-app-page-actions">{actions}</div>}</header>;
}
export function WorkspaceToolbar({children,label}:{children:ReactNode;label:string}) {
 return <div className="tr-app-toolbar" role="group" aria-label={label}>{children}</div>;
}
export function WorkspaceLoading({label='Loading workspace'}:{label?:string}) {
 return <div className="tr-app-loading" role="status" aria-busy="true"><span className="sr-only">{label}</span><div className="tr-app-loading-metrics" aria-hidden="true">{[0,1,2,3].map(n=><div key={n}><span/><strong/></div>)}</div><div className="tr-app-loading-table" aria-hidden="true">{[0,1,2,3,4].map(n=><div key={n}/>)}</div></div>;
}
