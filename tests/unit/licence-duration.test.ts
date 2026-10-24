import {it,expect} from 'vitest';
import {licenceExpiryAfterDays,licenceCustomExpiry,licenceLocalDate} from '@/lib/licence-duration';
it.each([7,30,90])('sets %s day duration from selection time',days=>{const start=new Date('2026-10-24T16:00:00Z');expect(Date.parse(licenceExpiryAfterDays(days,start))-start.getTime()).toBe(days*86400000);});
it('uses the end of the selected local calendar date',()=>{const end=new Date(licenceCustomExpiry('2026-12-31'));expect(end.getFullYear()).toBe(2026);expect(end.getMonth()).toBe(11);expect(end.getDate()).toBe(31);expect(end.getHours()).toBe(23);expect(end.getMinutes()).toBe(59);expect(licenceLocalDate(end.toISOString())).toBe('2026-12-31');});
it('does not convert no expiry into a date',()=>expect(licenceLocalDate(null)).toBe(''));
it('rejects invalid durations and dates',()=>{expect(()=>licenceExpiryAfterDays(365)).toThrow();expect(()=>licenceCustomExpiry('2026-02-30')).toThrow();expect(()=>licenceCustomExpiry('bad')).toThrow();});
