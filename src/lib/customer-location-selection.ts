/** Preferences are UI state, never authorization. Only account-owned IDs are restored. */
export function restoreCustomerLocation(saved:string|null,locations:{id:string}[]):string {
 if(saved===''||locations.some(location=>location.id===saved))return saved!;
 return locations.length===1?locations[0].id:'';
}
