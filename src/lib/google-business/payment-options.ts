export const paymentLabels=['Credit cards','Debit cards','Contactless mobile payments','Checks','Cash only'] as const;
export const cardBrands=[['visa','Visa'],['mastercard','Mastercard'],['american_express','American Express'],['discover','Discover'],['diners_club','Diners Club'],['jcb','JCB'],['china_union_pay','UnionPay']] as const;
export function paymentValue(text:string,label:string){return text.split('\n').find(line=>line.startsWith(label+':'))?.slice(label.length+1).trim()||'';}
// Replace only the selected field. Unknown imported attributes and explicit No values survive.
export function setPaymentValue(text:string,label:string,value:string){const lines=text.split('\n').filter(line=>line.trim()&&!line.startsWith(label+':'));if(value)lines.push(`${label}: ${value}`);return lines.join('\n');}
export function isPaymentLine(line:string){return [...paymentLabels,'Accepted credit cards'].some(label=>line.startsWith(label+':'));}
