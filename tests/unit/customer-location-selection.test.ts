import {describe,it,expect} from 'vitest';
import {restoreCustomerLocation} from '../../src/lib/customer-location-selection';
describe('customer location preference',()=>{
 const locations=[{id:'north'},{id:'south'}];
 it('restores an owned branch',()=>expect(restoreCustomerLocation('south',locations)).toBe('south'));
 it('rejects another account location',()=>expect(restoreCustomerLocation('foreign',locations)).toBe(''));
 it('preserves an explicit all-locations selection',()=>expect(restoreCustomerLocation('',[{id:'north'}])).toBe(''));
 it('defaults to the only owned location',()=>expect(restoreCustomerLocation(null,[{id:'north'}])).toBe('north'));
 it('does not choose arbitrarily for multiple locations',()=>expect(restoreCustomerLocation(null,locations)).toBe(''));
 it('handles an account with no locations',()=>expect(restoreCustomerLocation('deleted',[])).toBe(''));
});
