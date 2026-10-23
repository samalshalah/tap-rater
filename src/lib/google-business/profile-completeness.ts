import type {ProfileFields} from './profile-data';
export function profileCompleteness(profile:Partial<ProfileFields>){
 const d=profile.details||{};
 const fields:[string,unknown][]=[['Business name',profile.name],['Categories',profile.categories],['Description',profile.description],['Phone',profile.phone],['Website',profile.website],['Street address',d.street||profile.address],['City',d.city],['State / region',d.region],['Postal code',d.postalCode],['Country',d.country],['Regular hours',profile.hours],['Logo',d.logo],['Cover photo',d.cover],['Business photos',d.media?.length],['Payment methods',d.paymentMethods],['Attributes',d.attributes],['Social links',d.socialLinks]];
 const present=(value:unknown)=>typeof value==='string'?Boolean(value.trim()):Boolean(value);
 const missing=fields.filter(([,v])=>!present(v)).map(([label])=>label);
 return {percent:Math.round((fields.length-missing.length)/fields.length*100),missing,total:fields.length};
}
