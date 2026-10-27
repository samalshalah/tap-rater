import {describe,it,expect} from 'vitest';
import {profileSuggestions,profileDraftChanges} from '@/lib/google-business/profile-suggestions';
import type {ProfileFields} from '@/lib/google-business/profile-data';
const profile:ProfileFields={name:'Test florist',description:'Fresh flowers!',phone:'',website:'',address:'',categories:'Florist',hours:'',specialHours:'2020-01-01: Closed',details:{attributes:'Has delivery: No\nHas no contact delivery: Yes',mediaStatus:'partial'}};
describe('location-specific profile suggestions',()=>{
 it('uses the current location without invented business facts',()=>{const items=profileSuggestions(profile,new Date('2026-10-27'));expect(items[0].after).toBe('Fresh flowers.');expect(JSON.stringify(items)).not.toMatch(/Baghdad|shawarma|falafel/i);expect(profile.description).toBe('Fresh flowers!');});
 it('only flags the known delivery contradiction',()=>{expect(profileSuggestions(profile).some(s=>s.id==='delivery')).toBe(true);expect(profileSuggestions({...profile,details:{attributes:'Has delivery: Yes\nHas no contact delivery: Yes'}}).some(s=>s.id==='delivery')).toBe(false);});
 it('distinguishes missing data and old dates from verified problems',()=>{const items=profileSuggestions(profile,new Date('2026-10-27'));expect(items.find(s=>s.id==='hours')?.before).toContain('Only past');expect(items.find(s=>s.id==='photos')?.before).toContain('partial');expect(items.find(s=>s.id==='website')?.after).toContain('Do not invent');});
 it('preserves tracking parameters and never defaults to guessed categories or hours',()=>{const p={...profile,website:'https://example.com/?utm_source=google',specialHours:'2026-11-26: 10:00–22:00'};const s=profileSuggestions(p,new Date('2026-10-27'));expect(s.find(x=>x.id==='website')?.before).toBe(p.website);expect(s.find(x=>x.id==='categories')?.before).toBe('Florist');expect(s.find(x=>x.id==='hours')?.before).toBe(p.specialHours);});
 it('compares nested changes and removals without changing either snapshot',()=>{const draft={...profile,description:'Confirmed wording',details:{...profile.details,cover:'https://example.com/cover.jpg'}};const changes=profileDraftChanges(profile,draft);expect(changes.map(c=>c.key)).toEqual(['description','details.cover']);expect(profileDraftChanges(profile,profile)).toEqual([]);expect(profileDraftChanges({...profile,details:{cover:'https://example.com/old.jpg'}},profile).some(c=>c.key==='details.cover'&&c.after==='')).toBe(true);});
});

describe('honest review guidance',()=>{
 it('does not claim unchanged wording is an improvement',()=>{const p={...profile,description:'Fresh flowers.'};const item=profileSuggestions(p)[0];expect(item.after).toBe(p.description);expect(item.evidence).toContain('No automatic wording change');});
 it('identifies the actual primary category and preserves past hours',()=>{const items=profileSuggestions({...profile,categories:'Florist\nGift shop'},new Date('2026-10-27'));expect(items.find(i=>i.id==='categories')?.evidence).toContain('Florist. 1 additional');expect(items.find(i=>i.id==='hours')?.before).toContain('2020-01-01');});
 it('leaves an empty description empty and asks for confirmed facts',()=>{const item=profileSuggestions({...profile,description:''})[0];expect(item.after).toBe('');expect(item.tag).toBe('Missing information');});
});
