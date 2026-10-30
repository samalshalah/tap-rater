import {useEffect,useRef} from 'react';
import * as THREE from 'three';

// Reconstructed from the observed folded-surface geometry and motion parameters.
// The noise uses the standard xxHash and 2D simplex algorithms.
const noise = `
uint rol17(uint x){return (x<<17u)|(x>>15u);}
float cellRandom(vec2 p){
 uvec2 bits=floatBitsToUint(p);
 uint h=rol17(0xc2b2ae3du*bits.x+0x165667b9u)*0x27d4eb2fu;
 h=rol17(h+0xc2b2ae3du*bits.y)*0x27d4eb2fu;
 h=(h^(h>>15u))*0x85ebca77u;h=(h^(h>>13u))*0xc2b2ae3du;h^=h>>16u;
 return uintBitsToFloat((h>>9u)|0x3f800000u)-1.;
}
vec2 gradientAt(vec2 p){float angle=6.283185307*cellRandom(p);return vec2(cos(angle),sin(angle));}
float field(vec2 p){
 vec2 cell=floor(p+(p.x+p.y)*.366025404);
 vec2 a=p-cell+(cell.x+cell.y)*.211324865;
 vec2 corner=a.x>=a.y?vec2(1.,0.):vec2(0.,1.);
 vec2 b=a-corner+.211324865,c=a-1.+.422649730;
 vec3 w=max(vec3(.5)-vec3(dot(a,a),dot(b,b),dot(c,c)),0.);
 return 32.99*dot(w*w*w,vec3(dot(a,gradientAt(cell)),dot(b,gradientAt(cell+corner)),dot(c,gradientAt(cell+1.))));
}`;
const vertex = `
uniform float clock;varying vec2 surfaceUV;varying vec3 surfacePosition;
${noise}
vec3 rotateAround(vec3 p,vec3 axis,float theta){axis=normalize(axis);return p*cos(theta)+cross(axis,p)*sin(theta)+axis*dot(axis,p)*(1.-cos(theta));}
float falloff(float x,float power){return exp2(-pow(2.*x,power));}
void main(){
 surfaceUV=uv;
 vec3 p=position;
 float tick=clock*.00004;
 p.y-=7.821*field(vec2(p.x*.005831+tick,p.z*.016001+tick));
 p=rotateAround(p,vec3(.5,0.,.5),.41*falloff(uv.x,.7));
 p=rotateAround(p,vec3(0.,.5,.5),-.65*falloff(uv.y,3.63));
 p=rotateAround(p,vec3(.5,0.,.5),-.58*falloff(uv.y,3.95));
 surfacePosition=p;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const fragment = `
uniform sampler2D palette;uniform vec2 resolution;
varying vec2 surfaceUV;varying vec3 surfacePosition;
${noise}
void main(){
 vec2 uv=surfaceUV;
 vec3 color=texture2D(palette,uv).rgb;
 float light=clamp(.5+.5*dFdy(uv).y*resolution.y*1.98,0.,1.);
 light=smoothstep(0.,.834,pow(light,.806));
 float broad=field(vec2(uv.x*.1,uv.y*.5));
 float fiber=.5+.5*field(vec2(uv.x*(600.+300.*broad),uv.y*4.*broad));
 float edge=1.-pow(4.*uv.x*(1.-uv.x),3.);
 color+=fiber*.2*(1.-color.b*.9)*light*edge;
 vec3 axis=vec3(.57735),center=axis*dot(axis,color),offset=color-center;
 color=center+offset*cos(-.00159265358979299)+cross(axis,offset)*sin(-.00159265358979299);
 color+=.25*(1.-light);
 gl_FragColor=vec4(clamp(color,0.,1.),1.);
}`;
const postVertex=`varying vec2 screenUV;void main(){screenUV=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const postFragment=`
uniform sampler2D sceneImage;varying vec2 screenUV;
void main(){
 vec2 q=screenUV-.5;float angle=.02/6.;float c=cos(angle),s=sin(angle);vec4 sum=vec4(0.);
 for(int i=0;i<6;i++){sum+=texture2D(sceneImage,q+.5);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);}
 float focus=smoothstep(0.,.7,screenUV.y)-smoothstep(.2,1.,screenUV.y);
 vec4 result=mix(sum/6.,texture2D(sceneImage,screenUV),focus);
 float grain=fract(sin(dot(gl_FragCoord.xy*.01,vec2(12.9898,78.233)))*43758.5453);
 result.rgb+=(1.-2.*grain)*(4./255.)*1.1;
 gl_FragColor=vec4(min(result.rgb,1.),result.a);
}`;

function foldedSurface(){
 const geometry=new THREE.PlaneGeometry(400,400,128,256);
 const positions=geometry.attributes.position,uvs=geometry.attributes.uv;
 for(let i=0;i<positions.count;i++){
   let x=positions.getX(i),y=positions.getY(i),z=0;
   const v=uvs.getY(i),radius=4-2*Math.pow(4*v*(1-v),9.5);
   if(x < -16)z=radius;
   else if(x < 16){const t=(x+16)/32;z=Math.cos(t*Math.PI)*radius;x=Math.sin(t*Math.PI)*radius-16;}
   else {z=-radius;x=-x;}
   // The two quarter turns put the folded sheet into the X/Z plane.
   positions.setXYZ(i,y,z,x+100);
 }
 positions.needsUpdate=true;geometry.computeVertexNormals();return geometry;
}

export default function Wave({paused,variant='hero'}){
 const canvasRef=useRef(),pauseRef=useRef(paused);
 useEffect(()=>{pauseRef.current=paused},[paused]);
 useEffect(()=>{
   const canvas=canvasRef.current;
   let renderer,texture,material,geometry,target,postMaterial,postGeometry,mesh;
   let stopped=false,frame=0,visible=true,ready=false,last=0,elapsed=0,intro=0,drawnAt=0,needsRender=true;
   const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,0,0,0,1,10000);
   camera.position.set(100,0,5000);camera.lookAt(0,0,0);
   const postScene=new THREE.Scene(),postCamera=new THREE.Camera();
   const cleanup=()=>{stopped=true;cancelAnimationFrame(frame);resizeObserver?.disconnect();intersection?.disconnect();texture?.dispose();material?.dispose();geometry?.dispose();target?.dispose();postMaterial?.dispose();postGeometry?.dispose();renderer?.dispose();};
   let resizeObserver,intersection;
   try {
     renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'high-performance'});
     renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
     // Shader colors are already display-referred, as in the reference renderer.
     renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
     target=new THREE.WebGLRenderTarget(1,1);
     material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.SrcColorFactor,blendDst:THREE.ZeroFactor,uniforms:{clock:{value:35000},palette:{value:null},resolution:{value:new THREE.Vector2()}}});
     geometry=foldedSurface();mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
     postMaterial=new THREE.ShaderMaterial({vertexShader:postVertex,fragmentShader:postFragment,transparent:false,depthTest:false,depthWrite:false,uniforms:{sceneImage:{value:target.texture}}});
     postGeometry=new THREE.PlaneGeometry(2,2);postScene.add(new THREE.Mesh(postGeometry,postMaterial));
     const resize=()=>{
       const width=canvas.clientWidth,height=canvas.clientHeight,ratio=Math.min(devicePixelRatio,2);
       if(!width||!height)return;
       renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);target.setSize(Math.round(width*ratio),Math.round(height*ratio));
       material.uniforms.resolution.value.set(width*ratio,height*ratio);
       camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
       const vw=innerWidth;
       mesh.position.set(vw<640?320:vw<1264?525:380,vw<640?-315:-301.7,-11.1);
       mesh.rotation.set(vw<640?-.5:vw<1264?-.64:-.449592653589793,-.117592653589793,vw<640?1.64:vw<1264?1.68:1.87440734641021);
       mesh.scale.set(9,8,5);needsRender=true;
     };
     resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);resize();
     intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;needsRender=true;});intersection.observe(canvas);
     new THREE.TextureLoader().load('/assets/wave-palette.webp',loaded=>{
       if(stopped){loaded.dispose();return;}texture=loaded;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;material.uniforms.palette.value=texture;ready=true;needsRender=true;
     },undefined,()=>{canvas.dataset.waveError='palette-load';});
     const draw=now=>{
       if(stopped)return;
       const delta=last?Math.max(0,Math.min(now-last,100)):0;last=now;
       if(visible&&!document.hidden&&ready){
         if(!pauseRef.current){elapsed+=delta;needsRender=true;}
         if(needsRender&&(pauseRef.current||now-drawnAt>=30)){
           drawnAt=now;if(!pauseRef.current)intro=Math.min(1,intro+.016);
           material.uniforms.clock.value=35000+elapsed*intro;
           renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
           canvas.classList.add('ready');canvas.dataset.motionTime=material.uniforms.clock.value.toFixed(1);needsRender=false;
         }
       }
       frame=requestAnimationFrame(draw);
     };frame=requestAnimationFrame(draw);
   }catch(error){canvas.dataset.waveError=error.message;console.warn('Wave fallback:',error);}
   return cleanup;
 },[]);
 return <div className={'wave wave-'+variant+(paused?' is-paused':' is-moving')} aria-hidden="true"><div className="wave-drift"><img src="/assets/wave-fallback.webp" alt=""/><canvas ref={canvasRef}/></div></div>;
}
