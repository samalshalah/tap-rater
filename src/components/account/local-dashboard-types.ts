import type {OverviewLocation} from './review-overview';
import type {DirectoryLocation,DirectoryRecord} from './directory-manager';
export type Location=OverviewLocation&DirectoryLocation&{id:string;customer_id:string;email:string;business_name:string;address:string|null;phone:string|null;website_url:string|null;connected:boolean;google_title:string|null;synced_at:string|null;next_page:string|null;last_error:string|null;review_count:number;unanswered_count:number;draft_count:number};
export type Listing=DirectoryRecord&{id:string;business_id:string;directory:string;status:string;listing_url:string;listed_name:string;listed_address:string;listed_phone:string;notes:string;version:number;updated_at:string};
export type Snapshot={licenses?:{location_limit:number;unlimited_locations:boolean;used:number}|null;locations:Location[];listings:Listing[];customers:{id:string;email:string}[]};
