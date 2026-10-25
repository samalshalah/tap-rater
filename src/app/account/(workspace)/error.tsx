'use client';
export default function WorkspaceError({reset}:{error:Error&{digest?:string};reset:()=>void}) {
 return <section className="tr-app-error" role="alert"><h1>This page couldn’t load</h1><p>Your workspace is still available. Try loading this page again.</p><button className="tr-button-primary" onClick={reset}>Try again</button></section>;
}
