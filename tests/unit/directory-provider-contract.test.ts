import {describe,it,expect,vi} from 'vitest';
import {directoryDefinitions,findDirectory,missingDirectories} from '../../src/lib/directory-catalog';
import {directoryReadiness,readMappedDirectory,type DirectoryProviderMapping} from '../../src/lib/directory-provider-contract';

describe('reference directory catalog',()=>{
 it('contains the 73 requested directories with unique stable IDs and resolvable relationships',()=>{
  expect(directoryDefinitions).toHaveLength(73);
  expect(new Set(directoryDefinitions.map(d=>d.id)).size).toBe(73);
  for(const d of directoryDefinitions){expect(findDirectory(d.name)?.id).toBe(d.id);if(d.referenceParentId)expect(findDirectory(d.referenceParentId)).toBeDefined();}
 });
 it('recognizes legacy labels without replacing saved data',()=>{
  const saved=['Apple','Apple Maps','Bing Places','BBB','Yellow Pages','HotFrog','My custom directory'];
  const before=[...saved];
  expect(missingDirectories(saved)).toHaveLength(68);
  expect(saved).toEqual(before);
  expect(findDirectory('Better Business Bureau')?.id).toBe('bbb');
  expect(findDirectory('Yellow Pages')?.id).toBe('yp-com');
 });
 it('keeps a new location checklist independent',()=>{
  expect(missingDirectories(['Yelp'])).toHaveLength(72);
  expect(missingDirectories([])).toHaveLength(73);
 });
});
describe('future directory provider boundary',()=>{
 const scope={customerId:'customer-a',businessId:'location-a'};
 const mapping:DirectoryProviderMapping={...scope,providerId:'test-provider',externalLocationId:'external-a',directoryId:'yelp',publisherId:'provider-publisher',coverageVerified:true};
 const adapter={providerId:'test-provider',readListings:vi.fn(async()=>({listings:[]}))};
 it('defaults every directory to disconnected',()=>{for(const d of directoryDefinitions)expect(directoryReadiness(scope,d.id)).toBe('provider_required');});
 it('requires exact customer, location and provider mappings',async()=>{
  for(const change of [{customerId:'other'},{businessId:'other'},{providerId:'other'},{directoryId:'facebook'},{externalLocationId:''}]){
   await expect(readMappedDirectory(scope,'Yelp',{...mapping,...change},adapter)).rejects.toThrow('location_mapping_required');
  }
  expect(adapter.readListings).not.toHaveBeenCalled();
 });
 it('requires provider-verified coverage and a real publisher ID',()=>{
  expect(directoryReadiness(scope,'Yelp',{...mapping,coverageVerified:false},adapter)).toBe('coverage_verification_required');
  expect(directoryReadiness(scope,'Yelp',{...mapping,publisherId:''},adapter)).toBe('coverage_verification_required');
 });
 it('passes the scoped mapping and pagination cursor to a configured read adapter',async()=>{
  await readMappedDirectory(scope,'Yelp',mapping,adapter,'page-2');
  expect(adapter.readListings).toHaveBeenCalledWith({scope,mapping,cursor:'page-2'});
 });
});
