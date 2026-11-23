import {staticStorefrontProducts} from './product-repository';
import {productSupportsMultiLink} from './service-addons';

// Admin grants record the chosen stand in hosted_page_codes.physical_product_ref.
const prefix='admin-stand:';

export type GrantedStand={slug:string;title:string;headline:string;imageUrl?:string};

export function multiLinkGrantStands():GrantedStand[]{
  return staticStorefrontProducts().filter(productSupportsMultiLink).map(product=>({
    slug:product.slug,title:product.title.replace(/^Tap Rater\s+/i,''),headline:(product.displayText?.trim()||product.title).slice(0,140),imageUrl:product.images[0]?.src
  }));
}

export function grantedStandReference(slug:string,requestId:string){return `${prefix}${slug}:${requestId}`;}

export function readGrantedStand(reference?:string|null):GrantedStand|undefined{
  if(!reference?.startsWith(prefix))return undefined;
  const slug=reference.slice(prefix.length).split(':')[0];
  return multiLinkGrantStands().find(stand=>stand.slug===slug);
}
