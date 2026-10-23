import {describe,it,expect} from 'vitest';
import {attributeRows,updateAttribute} from '@/lib/google-business/attribute-options';
describe('attribute draft controls',()=>{
 const text='Has delivery: Yes\nHas wheelchair accessible seating: No\nChecks: No\nUrl instagram: https://instagram.com/business\nCustom attribute: legacy value';
 it('groups imported attributes and excludes payment controls',()=>{const rows=attributeRows(text);expect(rows.map(row=>row.group)).toEqual(['Service options','Accessibility','Social links','Other attributes']);expect(rows[1].value).toBe('No');expect(rows[2].editable).toBe(false);expect(rows[3].editable).toBe(false);});
 it('changes only the selected attribute, preserving payment and unknown fields',()=>{expect(updateAttribute(text,0,'No')).toBe(text.replace('Has delivery: Yes','Has delivery: No'));});
 it('persists unconfirmed distinctly from No and allows confirmation again',()=>{const cleared=updateAttribute(text,1,'');expect(attributeRows(cleared)[1].value).toBe('');expect(attributeRows(cleared)[1].editable).toBe(true);expect(updateAttribute(cleared,1,'No')).toBe(text);});
 it('rejects unsupported, payment and missing rows',()=>{for(const index of [2,3,4,9])expect(()=>updateAttribute(text,index,'Yes')).toThrow();});
 it('preserves duplicate and malformed legacy lines',()=>{expect(updateAttribute('Has delivery: Yes\nHas delivery: No\nLegacy text',0,'No')).toBe('Has delivery: No\nHas delivery: No\nLegacy text');});
});
