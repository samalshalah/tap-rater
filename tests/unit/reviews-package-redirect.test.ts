import {expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(url);}}));
import Page from '@/app/google-reviews/packages/page';
it('keeps old package links pointing at the embedded plan',async()=>{await expect(Page({searchParams:Promise.resolve({})})).rejects.toThrow('/google-reviews#plan');});
it('preserves the cancelled checkout notice on the landing page',async()=>{await expect(Page({searchParams:Promise.resolve({checkout:'cancelled'})})).rejects.toThrow('/google-reviews?checkout=cancelled#plan');});
