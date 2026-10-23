export const socialPlatforms=[
 {key:'facebook',label:'Facebook',hosts:['facebook.com','fb.com'],example:'https://www.facebook.com/yourbusiness'},
 {key:'instagram',label:'Instagram',hosts:['instagram.com'],example:'https://www.instagram.com/yourbusiness'},
 {key:'tiktok',label:'TikTok',hosts:['tiktok.com'],example:'https://www.tiktok.com/@yourbusiness'},
 {key:'youtube',label:'YouTube',hosts:['youtube.com','youtu.be'],example:'https://www.youtube.com/@yourbusiness'},
 {key:'twitter',label:'X (Twitter)',hosts:['x.com','twitter.com'],example:'https://x.com/yourbusiness'},
 {key:'linkedin',label:'LinkedIn',hosts:['linkedin.com'],example:'https://www.linkedin.com/company/yourbusiness'},
 {key:'pinterest',label:'Pinterest',hosts:['pinterest.com'],example:'https://www.pinterest.com/yourbusiness'}] as const;
export type SocialKey=typeof socialPlatforms[number]['key'];
function platformForLabel(label:string){return socialPlatforms.find(p=>[p.key,p.label.toLowerCase(),'url '+p.key].includes(label.toLowerCase().trim()));}
export function socialLine(line:string):{key:SocialKey|undefined;url:string}{
 const labeled=line.match(/^([^:]+):\s*(.*)$/);const platform=labeled&&platformForLabel(labeled[1]);if(platform)return {key:platform.key,url:labeled![2].trim()};
 try{const url=new URL(line.trim());const platform=socialPlatforms.find(p=>p.hosts.some(host=>url.hostname===host||url.hostname.endsWith('.'+host)));return {key:platform?.key,url:line.trim()};}catch{return {key:undefined,url:line.trim()};}
}
export function socialValues(text:string){const values:Partial<Record<SocialKey,string>>={};const other:string[]=[];for(const line of text.split('\n').filter(line=>line.trim())){const item=socialLine(line);if(item.key&&values[item.key]===undefined)values[item.key]=item.url;else other.push(line);}return {values,other};}
export function socialError(key:SocialKey,value:string){if(!value.trim())return '';const platform=socialPlatforms.find(p=>p.key===key)!;try{const url=new URL(value.trim());if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!platform.hosts.some(host=>url.hostname===host||url.hostname.endsWith('.'+host)))throw new Error();return '';}catch{return `Enter a complete ${platform.label} URL, or leave it blank.`;}}
/** Replace only this platform's first link; preserve additional and unrecognized imported links. */
export function updateSocialLink(text:string,attributes:string,key:SocialKey,value:string){const lines=text.split('\n');const index=lines.findIndex(line=>socialLine(line).key===key);const next=`${socialPlatforms.find(p=>p.key===key)!.label}: ${value}`;if(index<0)lines.push(next);else lines[index]=next;
 const attributeLines=attributes.split('\n').filter(line=>!new RegExp('^Url '+key+':','i').test(line));if(value.trim())attributeLines.push(`Url ${key}: ${value.trim()}`);
 return {socialLinks:lines.filter(line=>line.trim()).join('\n'),attributes:attributeLines.filter(line=>line.trim()).join('\n')};}
