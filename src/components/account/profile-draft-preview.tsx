"use client";
import {useMemo} from 'react';
import {profileDraftChanges} from '@/lib/google-business/profile-suggestions';
import type {ProfileFields} from '@/lib/google-business/profile-data';
export function ProfileDraftPreview({observed,draft,busy,dirty,onSave,onEditor,changes:providedChanges}:{changes?:ReturnType<typeof profileDraftChanges>;observed:ProfileFields;draft:ProfileFields;busy:boolean;dirty:boolean;onSave:()=>void;onEditor:()=>void}){
 const changes=useMemo(()=>providedChanges??profileDraftChanges(observed,draft),[providedChanges,observed,draft]);
 return <section className="tr-profile-draft-preview" aria-label="Profile draft comparison"><header><h3>Review proposed changes</h3><span>{changes.length} changed fields · {dirty?'Unsaved edits':changes.length?'Saved draft':'No changes'}</span></header>{changes.length?changes.map(change=><article key={change.key}><h4>{change.label}</h4><div className="tr-profile-compare"><section><h4>Before · saved Google profile</h4><p>{change.before||'Not provided'}</p></section><section><h4>After · draft only</h4><p>{change.after||'Removed in draft'}</p></section></div></article>):<p>No proposed changes. Choose a suggestion or edit the business profile.</p>}<footer><small>Saving a draft does not publish. Some fields are draft-only; the editor identifies what can be submitted to Google.</small><button className="tr-button-ghost" disabled={busy} onClick={onEditor}>Open profile editor</button><button className="tr-button-primary" disabled={busy||!dirty} onClick={onSave}>Save draft only</button></footer></section>;
}
