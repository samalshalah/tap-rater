/** Reference catalog requested by the customer; inclusion is not verified API coverage. */
export type DirectoryDefinition = {
 id: string;
 name: string;
 aliases: readonly string[];
 referenceParentId?: string;
};
export const directoryDefinitions: readonly DirectoryDefinition[] = [
 {"id": "8coupons", "name": "8coupons", "aliases": []},
 {"id": "amazon-alexa", "name": "Amazon Alexa", "aliases": []},
 {"id": "american-express", "name": "American Express", "aliases": []},
 {"id": "apple-maps", "name": "Apple Maps", "aliases": ["Apple"]},
 {"id": "aroundme", "name": "AroundMe", "aliases": []},
 {"id": "bbb", "name": "BBB", "aliases": ["Better Business Bureau"]},
 {"id": "bing-places", "name": "Bing Places", "aliases": ["Bing"]},
 {"id": "brave", "name": "Brave", "aliases": []},
 {"id": "brownbook-net", "name": "Brownbook.net", "aliases": []},
 {"id": "chamberofcommerce-com", "name": "ChamberofCommerce.com", "aliases": []},
 {"id": "citysquares", "name": "CitySquares", "aliases": []},
 {"id": "cylex", "name": "Cylex", "aliases": []},
 {"id": "dexknows", "name": "DexKnows", "aliases": [], "referenceParentId": "yp-com"},
 {"id": "dola", "name": "Dola", "aliases": []},
 {"id": "doordash", "name": "DoorDash", "aliases": []},
 {"id": "dun-bradstreet", "name": "Dun & Bradstreet", "aliases": []},
 {"id": "elocal", "name": "eLocal", "aliases": []},
 {"id": "ezlocal", "name": "EZlocal", "aliases": []},
 {"id": "facebook", "name": "Facebook", "aliases": []},
 {"id": "find-open", "name": "Find Open", "aliases": [], "referenceParentId": "cylex"},
 {"id": "firmania", "name": "Firmania", "aliases": [], "referenceParentId": "cylex"},
 {"id": "foursquare", "name": "Foursquare", "aliases": []},
 {"id": "gemini", "name": "Gemini", "aliases": [], "referenceParentId": "google-business-profile"},
 {"id": "golocal247", "name": "GoLocal247", "aliases": []},
 {"id": "google-business-profile", "name": "Google Business Profile", "aliases": []},
 {"id": "here", "name": "HERE", "aliases": []},
 {"id": "hotfrog", "name": "Hotfrog", "aliases": ["HotFrog"]},
 {"id": "hours-com", "name": "Hours.com", "aliases": []},
 {"id": "ibegin", "name": "iBegin", "aliases": []},
 {"id": "iglobal", "name": "iGlobal", "aliases": []},
 {"id": "instagram", "name": "Instagram", "aliases": [], "referenceParentId": "facebook"},
 {"id": "instacart", "name": "Instacart", "aliases": []},
 {"id": "mapbox", "name": "Mapbox", "aliases": []},
 {"id": "mapquest", "name": "MapQuest", "aliases": []},
 {"id": "mapstr", "name": "Mapstr", "aliases": []},
 {"id": "merchantcircle", "name": "MerchantCircle", "aliases": []},
 {"id": "meta-places-graph", "name": "Meta Places Graph", "aliases": []},
 {"id": "money-mailer", "name": "Money Mailer", "aliases": []},
 {"id": "my-local-services", "name": "My Local Services", "aliases": []},
 {"id": "n49", "name": "n49", "aliases": []},
 {"id": "navmii", "name": "Navmii", "aliases": []},
 {"id": "nextdoor", "name": "Nextdoor", "aliases": []},
 {"id": "openai", "name": "OpenAI", "aliases": []},
 {"id": "opendi", "name": "Opendi", "aliases": []},
 {"id": "pitney-bowes", "name": "Pitney Bowes", "aliases": []},
 {"id": "postmates", "name": "Postmates", "aliases": [], "referenceParentId": "uber-eats"},
 {"id": "property-capsule", "name": "Property Capsule", "aliases": []},
 {"id": "safegraph", "name": "SafeGraph", "aliases": []},
 {"id": "showmelocal", "name": "ShowMeLocal", "aliases": []},
 {"id": "siri", "name": "Siri", "aliases": [], "referenceParentId": "apple-maps"},
 {"id": "snapchat", "name": "Snapchat", "aliases": []},
 {"id": "soleo", "name": "Soleo", "aliases": []},
 {"id": "spalocal", "name": "SpaLocal", "aliases": []},
 {"id": "superpages", "name": "Superpages", "aliases": [], "referenceParentId": "yp-com"},
 {"id": "tellows", "name": "tellows", "aliases": []},
 {"id": "tiktok", "name": "TikTok", "aliases": []},
 {"id": "tomtom", "name": "TomTom", "aliases": []},
 {"id": "tripadvisor", "name": "TripAdvisor", "aliases": []},
 {"id": "tupalo", "name": "Tupalo", "aliases": []},
 {"id": "uber", "name": "Uber", "aliases": []},
 {"id": "uber-eats", "name": "Uber Eats", "aliases": []},
 {"id": "uber-freight", "name": "Uber Freight", "aliases": [], "referenceParentId": "uber"},
 {"id": "uscity-net", "name": "USCity.net", "aliases": []},
 {"id": "waze", "name": "Waze", "aliases": [], "referenceParentId": "google-business-profile"},
 {"id": "where-to", "name": "Where To?", "aliases": []},
 {"id": "wogibtswas-de", "name": "wogibtswas.de", "aliases": []},
 {"id": "yahoo", "name": "Yahoo!", "aliases": []},
 {"id": "yandex", "name": "Yandex", "aliases": []},
 {"id": "yango", "name": "Yango", "aliases": [], "referenceParentId": "yandex"},
 {"id": "yellowpagesdirectory", "name": "YellowPagesDirectory", "aliases": []},
 {"id": "yelp", "name": "Yelp", "aliases": []},
 {"id": "yp-com", "name": "YP.com", "aliases": ["Yellow Pages"]},
 {"id": "ziplocalonline", "name": "ZipLocalOnline", "aliases": []},
 ];
export const directoryCatalog = directoryDefinitions.map(directory => directory.name);
const directoryKey = (value: string) => value.trim().toLowerCase();
export function findDirectory(value: string): DirectoryDefinition | undefined {
 const key = directoryKey(value);
 return directoryDefinitions.find(d => d.id === key || [d.name, ...d.aliases].some(name => directoryKey(name) === key));
}
/** Only fill missing checklist entries. Saved records, including custom names, remain untouched. */
export function missingDirectories(savedNames: readonly string[]): readonly DirectoryDefinition[] {
 const present = new Set(savedNames.map(name => findDirectory(name)?.id));
 return directoryDefinitions.filter(d => !present.has(d.id));
}

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
