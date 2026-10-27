import { Star } from 'lucide-react';
import type { Row } from './google-live-review-types';
const ratings:Record<string,number>={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
export function reviewerName(review:Row){return review.data.reviewer?.isAnonymous?'Anonymous':review.data.reviewer?.displayName||'Google reviewer';}
export function ReviewAvatar({name}:{name:string}){return <span className="tr-review-avatar" aria-hidden="true">{name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()}</span>;}
export function ReviewStars({rating}:{rating:string}){const value=ratings[rating]||0;return <span className="tr-review-stars" aria-label={value?`${value} out of 5 stars`:'Rating unavailable'}>{Array.from({length:5},(_,i)=><Star key={i} size={20} strokeWidth={1.4} fill="currentColor" className={i<value?'':'is-empty'} aria-hidden="true"/>)}</span>;}
export function reviewDate(review:Row){const value=review.data.createTime||review.data.updateTime;if(!value)return 'Date unavailable';const date=new Date(value);return Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'});}
