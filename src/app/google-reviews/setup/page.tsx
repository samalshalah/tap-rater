import type {Metadata} from 'next';
import {ReviewsLandingPurchase} from '@/components/account/reviews-landing-purchase';
export const metadata:Metadata={title:'Set up Google Reviews',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function ReviewsSetup(){return <ReviewsLandingPurchase focused/>;}
