export const directoryCatalog = ['Google Business Profile','Apple Maps','Bing Places','Yelp','Facebook','Foursquare','Yellow Pages','BBB'] as const;

export type CanonicalLocation = {business_name:string;address:string|null;phone:string|null;website_url:string|null};
export type ObservedListing = {listed_name:string;listed_address:string;listed_phone:string;listed_website?:string};
const normalize = (value:string|null|undefined) => (value||'').trim().toLowerCase().replace(/\s+/g,' ');
const phone = (value:string|null|undefined) => (value||'').replace(/\D/g,'');
const website = (value:string|null|undefined) => normalize(value).replace(/^https?:\/\//,'').replace(/\/$/,'');
export function listingDifferences(location:CanonicalLocation,listing:ObservedListing){
 return [
  ['Name',normalize(location.business_name),normalize(listing.listed_name)],
  ['Address',normalize(location.address),normalize(listing.listed_address)],
  ['Phone',phone(location.phone),phone(listing.listed_phone)],
  ['Website',website(location.website_url),website(listing.listed_website)],
 ].filter(([,expected,actual])=>expected&&expected!==actual).map(([label])=>label);
}
