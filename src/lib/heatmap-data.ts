import {z} from 'zod';

export const gridSettingsSchema=z.object({
 keyword:z.string().trim().min(2).max(120).regex(/^[\p{L}\p{N}\s'’&.,-]+$/u,'Use a plain search phrase without search operators.').transform(v=>v.replace(/\s+/g,' ')),
 size:z.union([z.literal(3),z.literal(5),z.literal(7)]),
 spacingKm:z.union([z.literal(0.25),z.literal(0.5),z.literal(1),z.literal(2)]),
 language:z.enum(['en','es','fr','ar']),
}).strict();
export type GridSettings=z.infer<typeof gridSettingsSchema>;
export type GridPoint={index:number;row:number;column:number;latitude:number;longitude:number};
export type HeatmapAnchor={title:string;latitude:number;longitude:number;placeId:string;centerSource:'google_api'|'google_places'|'selected';synced_at:string};
export type HeatmapTrack=GridSettings&{id:string;version:number;active:boolean;updated_at:string};

/** Equally spaced north/east offsets projected onto a sphere, with a stable row-major index. */
export function buildGrid(latitude:number,longitude:number,size:number,spacingKm:number):GridPoint[]{
 if(!Number.isFinite(latitude)||Math.abs(latitude)>80||!Number.isFinite(longitude)||Math.abs(longitude)>180||![3,5,7].includes(size)||![0.25,0.5,1,2].includes(spacingKm))throw new Error('Invalid map grid');
 const points:GridPoint[]=[],rad=Math.PI/180,lat=latitude*rad,lng=longitude*rad,half=(size-1)/2;
 for(let row=0;row<size;row++)for(let column=0;column<size;column++){
  const north=(half-row)*spacingKm,east=(column-half)*spacingKm,distance=Math.hypot(north,east)/6371.0088,bearing=Math.atan2(east,north);
  const phi=Math.asin(Math.sin(lat)*Math.cos(distance)+Math.cos(lat)*Math.sin(distance)*Math.cos(bearing));
  const lambda=lng+Math.atan2(Math.sin(bearing)*Math.sin(distance)*Math.cos(lat),Math.cos(distance)-Math.sin(lat)*Math.sin(phi));
  points.push({index:row*size+column,row,column,latitude:Number((phi/rad).toFixed(7)),longitude:Number((((lambda/rad+540)%360)-180).toFixed(7))});
 }
 return points;
}

export function mapLayout(points:GridPoint[],latitude:number,longitude:number,width=800,height=600){
 const project=(lat:number,lng:number,zoom:number)=>{const scale=256*2**zoom,s=Math.sin(lat*Math.PI/180);return {x:(lng+180)/360*scale,y:(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*scale};};
 let zoom=17;
 for(;zoom>2;zoom--){const center=project(latitude,longitude,zoom),scale=256*2**zoom;const fits=points.every(p=>{const q=project(p.latitude,p.longitude,zoom),dx=((q.x-center.x+scale*1.5)%scale)-scale/2;return Math.abs(dx)<width/2-70&&Math.abs(q.y-center.y)<height/2-70;});if(fits)break;}
 const center=project(latitude,longitude,zoom),left=center.x-width/2,top=center.y-height/2,tiles=[];
 for(let y=Math.floor(top/256);y<=Math.floor((top+height)/256);y++)for(let x=Math.floor(left/256);x<=Math.floor((left+width)/256);x++)if(y>=0&&y<2**zoom)tiles.push({x:((x%2**zoom)+2**zoom)%2**zoom,y,left:x*256-left,top:y*256-top,zoom});
 const scale=256*2**zoom;
 return {zoom,tiles,points:points.map(p=>{const q=project(p.latitude,p.longitude,zoom);return {...p,x:width/2+((q.x-center.x+scale*1.5)%scale)-scale/2,y:q.y-top};})};
}
