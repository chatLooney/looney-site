// @ts-nocheck -- VM mocks intentionally model multiple native client shapes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import vm from 'node:vm';

const policyResult = await build({entryPoints:['src/plugins/glassdrawer/policy.ts'],bundle:true,format:'cjs',write:false});
const policyContext={module:{exports:{}},exports:{}};
vm.runInNewContext(policyResult.outputFiles[0].text,policyContext);
const {clamp,validWallpaper,isLayoutSurface}=policyContext.module.exports;

test('settings are bounded and non-finite input is rejected',()=>{
 assert.equal(clamp(2,.15,.95,.42),.95);
 assert.equal(clamp(-1,.15,.95,.42),.15);
 assert.equal(clamp(NaN,.15,.95,.42),.42);
});
test('only HTTPS wallpapers without embedded credentials are accepted',()=>{
 assert.equal(validWallpaper('https://example.com/wall.jpg'),'https://example.com/wall.jpg');
 for(const url of ['javascript:alert(1)','http://example.com/x','file:///private/x','https://u:p@example.com/x','https://example.com/ x'])assert.equal(validWallpaper(url),undefined);
});
test('only neutral large layout surfaces are cleared',()=>{
 assert.equal(isLayoutSurface({flex:1,backgroundColor:'#19191f'}),true);
 assert.equal(isLayoutSurface({height:230,width:'100%',backgroundColor:'rgba(20,20,28,1)'}),true);
 assert.equal(isLayoutSurface({height:40,width:40,backgroundColor:'#19191f'}),false);
 assert.equal(isLayoutSurface({flex:1,backgroundColor:'#5865F2'}),false);
 assert.equal(isLayoutSurface({flex:1,backgroundColor:'#19191f'},'none'),false);
});

const pluginResult=await build({entryPoints:['src/plugins/glassdrawer/index.tsx'],bundle:true,format:'cjs',write:false,jsx:'transform',plugins:[{
 name:'mock-rain',setup(b){
  b.onResolve({filter:/^(@api\/|@lib\/|@metro$|@plugins|react(?:\/jsx-runtime)?$|react-native$)/},a=>({path:a.path,namespace:'mock'}));
  b.onResolve({filter:/^\.\/(Settings|storage)$/},a=>a.importer.endsWith('glassdrawer/index.tsx')?{path:a.path,namespace:'mock'}:undefined);
  b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:`module.exports=globalThis.mocks[${JSON.stringify(a.path)}]`,loader:'js'}));
 }
}]});

function harness({unsupported=false,conflict=false}={}){
 const hooks=new Map(); const disposals=[];
 const state={useThemeWallpaper:false,wallpaperUrl:'https://example.com/bg.jpg',drawerOpacity:.42,menuOpacity:.65,blur:6,transparentMenus:true};
 const flatten=s=>Array.isArray(s)?Object.assign({},...s.map(flatten)):s??{};
 const React={
  createElement:(type,props,...children)=>({type,key:props?.key??null,props:{...props,...(children.length?{children:children.length===1?children[0]:children}:{})}}),
  cloneElement:(e,p)=>({...e,props:{...e.props,...p}}),
  createContext:()=>({Provider:'provider',Consumer:'consumer'}),
  isValidElement:e=>!!e&&typeof e==='object'&&'type'in e&&'props'in e,
  useSyncExternalStore:(_sub,snapshot)=>snapshot(),useState:v=>[v,()=>{}],useEffect:()=>{}
 };
 const originalView=()=>React.createElement('RCTView',{style:{flex:1,backgroundColor:'#19191f'}});
 const Native={View:unsupported?{}:{render:originalView},ScrollView:{},ImageBackground:'image',StyleSheet:{flatten,absoluteFillObject:{position:'absolute',top:0,bottom:0,left:0,right:0}}};
 const resolver={resolveSemanticColor:()=> '#20202b'};
 const patch=(key,obj,callback,instead=false)=>{
  const original=obj[key];obj[key]=(...args)=>instead?callback(args,original):callback(args,original(...args));
  return()=>{obj[key]=original;disposals.push(key);};
 };
 const store=()=>state;store.getState=()=>state;
 const mocks={
  '@api/patcher':{after:(...a)=>patch(...a),instead:(...a)=>patch(...a,true)},
  '@api/react/jsx':{onJsxCreate:(name,cb)=>hooks.set(name,cb),deleteJsxCreate:(name)=>hooks.delete(name)},
  '@lib/utils/logger':{logger:{warn:()=>{}}},
  '@metro':{findByProps:()=>({default:{internal:resolver}})},
  '@plugins':{definePlugin:x=>x,isPluginEnabled:()=>conflict},
  '@plugins/_core/painter/themes/updater':{_colorRef:{current:null}},
  react:React,'react/jsx-runtime':{jsx:(t,p,k)=>React.createElement(t,{...p,key:k}),jsxs:(t,p,k)=>React.createElement(t,{...p,key:k})},'react-native':Native,'./Settings':()=>null,'./storage':{useGlassDrawer:store}
 };
 const context={module:{exports:{}},exports:{},mocks};vm.runInNewContext(pluginResult.outputFiles[0].text,context);
 return{plugin:context.module.exports.default,hooks,state,Native,React,resolver,originalView,disposals};
}

test('unsupported client and conflicting drawer fail before applying patches',()=>{
 for(const options of [{unsupported:true},{conflict:true}]){
  const h=harness(options);assert.throws(()=>h.plugin.eagerStart());assert.equal(h.hooks.size,0);assert.equal(h.disposals.length,0);
 }
});
test('surface clearing is scoped to the drawer; stop restores patch targets',()=>{
 const h=harness();h.plugin.eagerStart();assert.ok(h.hooks.has('LeftPanelContent'));
 const wrapped=h.Native.View.render();const consumer=wrapped.type(wrapped.props);
 const outside=consumer.props.children(false);assert.equal(outside.props.style.backgroundColor,'#19191f');
 const inside=consumer.props.children(true);assert.equal(h.Native.StyleSheet.flatten(inside.props.style).backgroundColor,'transparent');
 h.plugin.stop();assert.equal(h.Native.View.render,h.originalView);assert.equal(h.hooks.size,0);
 const stale=consumer.props.children(true);assert.equal(stale.props.style.backgroundColor,'#19191f');
});
test('menu overrides preserve non-menu semantic colours and restore on stop',()=>{
 const h=harness();h.plugin.eagerStart();const symbol=Symbol('semantic');
 assert.equal(h.resolver.resolveSemanticColor('theme',{[symbol]:'BACKGROUND_FLOATING'}),'rgba(18,18,26,0.65)');
 assert.equal(h.resolver.resolveSemanticColor('theme',{[symbol]:'TEXT_PRIMARY'}),'#20202b');
 h.state.transparentMenus=false;assert.equal(h.resolver.resolveSemanticColor('theme',{[symbol]:'BACKGROUND_FLOATING'}),'#20202b');
 h.plugin.stop();assert.equal(h.resolver.resolveSemanticColor(),'#20202b');
});
test('drawer wallpaper is wrapped without mutating the original element',()=>{
 const h=harness();h.plugin.eagerStart();const original=h.React.createElement('View',{style:{flex:1,backgroundColor:'#222228'}});
 const input=h.React.createElement(()=>original,{});const wrapper=h.hooks.get('LeftPanelContent')(null,input);
 const result=wrapper.type(wrapper.props);const image=result.props.children;
 assert.equal(image.type,'image');assert.equal(image.props.source.uri,'https://example.com/bg.jpg');assert.equal(typeof image.props.onError,'function');
 assert.equal(original.props.style.backgroundColor,'#222228');
 h.state.wallpaperUrl='javascript:invalid';const fallback=wrapper.type(wrapper.props);assert.equal(fallback.props.value,false);assert.equal(fallback.props.children,original);
 h.plugin.stop();
});

test('empty drawer render during navigation is returned safely',()=>{
 const h=harness();h.plugin.eagerStart();const input=h.React.createElement(()=>null,{});
 const wrapper=h.hooks.get('LeftPanelContent')(null,input);
 const result=wrapper.type(wrapper.props);assert.equal(result.props.value,false);assert.equal(result.props.children,null);
 h.plugin.stop();
});
