'use client';
import {createContext,useContext} from 'react';
export const ManagedReviewEndpoint=createContext<string|null>(null);
export function useReviewEndpoint(){return useContext(ManagedReviewEndpoint)||'/api/account/reviews/live';}
