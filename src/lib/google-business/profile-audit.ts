import type {ProfileFields} from './profile-data';
export function profileChecks(observed:Partial<ProfileFields>,now=new Date()){
 const fields=[['name','Business name'],['address','Address'],['phone','Phone'],['website','Website'],['categories','Categories'],['description','Description'],['hours','Regular hours']] as const;
 const checks:{key:keyof ProfileFields;label:string;status:string;detail:string}[]=fields.map(([key,label])=>({key,label,status:observed[key]?.trim()?'present':'needs_confirmation',detail:observed[key]?.trim()?'Present in the imported Google profile. Confirm it is accurate.':'Not returned in the imported profile. Confirm the correct information before drafting.'}));
 const dates=(observed.specialHours||'').match(/\b\d{4}-\d{2}-\d{2}\b/g)||[];
 const today=now.toISOString().slice(0,10);
 checks.push({key:'specialHours',label:'Special hours',status:dates.some(date=>date>=today)?'present':'needs_confirmation',detail:dates.length?'Check upcoming holiday hours; past entries do not confirm future opening times.':'No dated special hours were returned. Confirm any upcoming exceptions; do not invent holiday hours.'});
 return checks;
}
