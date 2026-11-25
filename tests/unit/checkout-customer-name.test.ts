import {describe,expect,it} from 'vitest';
import {joinCustomerName,splitCustomerName} from '@/components/checkout/checkout-details-types';

describe('checkout first and last name',()=>{
  it('joins the two boxes into the full name the order uses',()=>{
    expect(joinCustomerName(' Sam ','Al Shalah ')).toBe('Sam Al Shalah');
    expect(joinCustomerName('Sam','')).toBe('Sam');
    expect(joinCustomerName('','')).toBe('');
  });
  it('splits a saved name: first word, then the rest',()=>{
    expect(splitCustomerName('Sam Al Shalah')).toEqual({firstName:'Sam',lastName:'Al Shalah'});
    expect(splitCustomerName('Priority')).toEqual({firstName:'Priority',lastName:''});
  });
});
