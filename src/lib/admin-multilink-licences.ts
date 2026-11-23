export type AdminMultiLinkLicenceSource='admin'|'manual'|'subscription';
export type AdminMultiLinkLicence={code:string;businessName:string;source:AdminMultiLinkLicenceSource;published:boolean;links:number;invoices:number;createdAt:string;removable:boolean;blockedReason?:string};

export function licenceSource(reference:string):AdminMultiLinkLicenceSource{
  return reference.startsWith('admin:')?'admin':reference.startsWith('manual:')?'manual':'subscription';
}

// A licence can be removed only while nothing customer-facing or billed depends on it.
export function removalBlock(row:{source:AdminMultiLinkLicenceSource;published:boolean;invoices:number}){
  if(row.source==='subscription')return 'Paid subscription. Cancel it in Stripe instead.';
  if(row.published)return 'Page has been published.';
  if(row.invoices>0)return 'Licence has invoices.';
  return undefined;
}
