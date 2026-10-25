import {describe,it,expect} from 'vitest';
import {formatHeatmapDistance} from '@/lib/heatmap-distance';
describe('heatmap distance display',()=>{
 it('converts kilometres to statute miles',()=>{
  expect(formatHeatmapDistance(1.609344,'mi')).toBe('1');
  expect(formatHeatmapDistance(0.5,'mi')).toBe('0.311');
  expect(formatHeatmapDistance(4,'mi')).toBe('2.485');
 });
 it('keeps canonical kilometre values and removes trailing zeros',()=>{
  for(const km of [0.25,0.5,1,2])expect(formatHeatmapDistance(km,'km')).toBe(String(km));
  expect(formatHeatmapDistance(0,'mi')).toBe('0');
 });
});
