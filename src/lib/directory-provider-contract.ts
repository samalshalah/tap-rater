import {findDirectory} from './directory-catalog';

/** Server-side adapter contract. No provider or external write implementation is installed. */
export type DirectoryScope = {customerId:string;businessId:string};
export type DirectoryProviderMapping = DirectoryScope & {
 providerId:string;
 externalLocationId:string;
 directoryId:string;
 publisherId:string;
 coverageVerified:boolean;
};
export type DirectoryObservation = {
 directoryId:string;externalListingId:string;listingUrl:string|null;
 observedAt:string;name:string|null;address:string|null;phone:string|null;
 website:string|null;status:'listed'|'missing'|'processing'|'unavailable';
};
export type DirectoryReadAdapter = {
 providerId:string;
 // Implementations must resolve encrypted credentials for the authenticated scope server-side.
 readListings(input:{scope:DirectoryScope;mapping:DirectoryProviderMapping;cursor?:string}):Promise<{
  listings:DirectoryObservation[];nextCursor?:string;
 }>;
};
export type DirectoryReadiness = 'provider_required'|'location_mapping_required'|'coverage_verification_required'|'ready_for_read';
export function directoryReadiness(scope:DirectoryScope,directory:string,mapping?:DirectoryProviderMapping,adapter?:DirectoryReadAdapter):DirectoryReadiness {
 if(!adapter)return 'provider_required';
 const definition=findDirectory(directory);
 if(!definition||!mapping||mapping.customerId!==scope.customerId||mapping.businessId!==scope.businessId||mapping.directoryId!==definition.id||mapping.providerId!==adapter.providerId||!mapping.externalLocationId.trim())return 'location_mapping_required';
 if(!mapping.coverageVerified||!mapping.publisherId.trim())return 'coverage_verification_required';
 return 'ready_for_read';
}
/** Call only after authenticating the customer and checking ownership/package access. */
export async function readMappedDirectory(scope:DirectoryScope,directory:string,mapping:DirectoryProviderMapping,adapter:DirectoryReadAdapter,cursor?:string){
 const readiness=directoryReadiness(scope,directory,mapping,adapter);
 if(readiness!=='ready_for_read')throw new Error(readiness);
 return adapter.readListings({scope,mapping,cursor});
}
// Deliberately no submission method: future external writes need a separate approval/version gate.
