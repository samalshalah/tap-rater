import {describe,it,expect,vi} from 'vitest';
import type {MouseEvent} from 'react';
import {activateListRow} from '@/components/account/list-row-action';

function click({control=false,selected='',nested=false,...overrides}={}) {
 const row={ownerDocument:{getSelection:()=>({toString:()=>selected})}};
 return {button:0,defaultPrevented:false,currentTarget:row,
  target:{closest:(selector:string)=>selector==='[data-dashboard-row]'?(nested?{}:row):(control?{}:null)},
  ...overrides} as unknown as MouseEvent<HTMLElement>;
}
describe('dashboard row actions',()=>{
 it('opens details from row text or whitespace',()=>{const open=vi.fn();activateListRow(click(),open);expect(open).toHaveBeenCalledOnce();});
 it('preserves nested controls and nested row ownership',()=>{const open=vi.fn();activateListRow(click({control:true}),open);activateListRow(click({nested:true}),open);expect(open).not.toHaveBeenCalled();});
 it('allows selecting and copying row text without opening details',()=>{const open=vi.fn();activateListRow(click({selected:'Order reference'}),open);expect(open).not.toHaveBeenCalled();});
 it.each([{button:1},{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{defaultPrevented:true}])('ignores modified or cancelled clicks %o',overrides=>{const open=vi.fn();activateListRow({...click(),...overrides} as MouseEvent<HTMLElement>,open);expect(open).not.toHaveBeenCalled();});
});
