export function useRouter(){return {replace:()=>window.dispatchEvent(new Event('qa-dashboard')),refresh:()=>{},push:()=>{}};}
export const useSearchParams=()=>new URLSearchParams(window.location.search);
export const usePathname=()=>window.location.pathname;
