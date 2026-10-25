import {describe,it,expect,vi} from 'vitest';
import {lookupPlaceCoordinates,resolveHeatmapAnchor} from '@/lib/heatmap-anchor';

const profile={title:'Baghdad',placeId:'verified-place'};
describe('heat-map coordinate fallback',()=>{
 it('uses a complete profile pin without a Places request, including zero coordinates',async()=>{
  const lookup=vi.fn();expect(await resolveHeatmapAnchor({...profile,latitude:0,longitude:0},undefined,lookup)).toMatchObject({latitude:0,longitude:0,centerSource:'google_api'});expect(lookup).not.toHaveBeenCalled();
 });
 it('fills missing coordinates using only the connected Place ID',async()=>{
  const lookup=vi.fn().mockResolvedValue({latitude:38.2650042,longitude:-77.4959696});
  expect(await resolveHeatmapAnchor({...profile,latitude:38},undefined,lookup)).toMatchObject({...profile,latitude:38.2650042,longitude:-77.4959696,centerSource:'google_places'});expect(lookup).toHaveBeenCalledExactlyOnceWith(profile.placeId);
 });
 it('does not guess a Place ID or fetch when a manual center was supplied',async()=>{
  const lookup=vi.fn();expect(await resolveHeatmapAnchor({title:'Unknown'},undefined,lookup)).toBeNull();
  expect(await resolveHeatmapAnchor(profile,{latitude:38,longitude:-77},lookup)).toMatchObject({centerSource:'selected'});expect(lookup).not.toHaveBeenCalled();
 });
 it('requests only the exact ID and coordinates, with timeout and no scan API',async()=>{
  const request=vi.fn().mockResolvedValue(Response.json({status:'OK',result:{place_id:profile.placeId,geometry:{location:{lat:38,lng:-77}}}}));
  expect(await lookupPlaceCoordinates(profile.placeId,request,{GOOGLE_PLACES_API_KEY:'test'})).toEqual({latitude:38,longitude:-77});
  const [url,options]=request.mock.calls[0];expect(url.origin).toBe('https://maps.googleapis.com');expect(url.pathname).toBe('/maps/api/place/details/json');expect(url.searchParams.get('place_id')).toBe(profile.placeId);expect(url.searchParams.get('fields')).toBe('place_id,geometry/location');expect(options.signal).toBeInstanceOf(AbortSignal);expect(request).toHaveBeenCalledTimes(1);
 });
 it.each([
  {status:'REQUEST_DENIED'},
  {status:'OK',result:{place_id:'different-place',geometry:{location:{lat:38,lng:-77}}}},
  {status:'OK',result:{place_id:profile.placeId,geometry:{location:{lat:91,lng:-77}}}},
  {status:'OK',result:{place_id:profile.placeId}},
 ])('does not save a wrong or invalid pin (%j)',async body=>{
  const request=vi.fn().mockResolvedValue(Response.json(body));expect(await lookupPlaceCoordinates(profile.placeId,request,{GOOGLE_PLACES_API_KEY:'test'})).toBeNull();
 });
 it('handles missing credentials, outages and timeout without leaking secrets or retrying',async()=>{
  const request=vi.fn().mockRejectedValue(new Error('secret-bearing provider error'));
  expect(await lookupPlaceCoordinates(profile.placeId,request,{})).toBeNull();expect(request).not.toHaveBeenCalled();
  expect(await lookupPlaceCoordinates(profile.placeId,request,{GOOGLE_PLACES_API_KEY:'test'})).toBeNull();expect(request).toHaveBeenCalledTimes(1);
 });
});
