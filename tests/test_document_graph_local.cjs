// 检查局部图输出，防止直接关系超过八条时静默截断入向引用。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('policy/web_ui/document_graph.js','utf8');
const focus='procurement';
const pairs=[[focus,'law1'],['in1',focus],[focus,'old'],['in2',focus],[focus,'law2'],['in3',focus],[focus,'law3'],['in4',focus],['in5',focus],['in6',focus],[focus,'law4']];
const graph={nodes:[...new Set(pairs.flat())].map(id=>({id,title:id})),edges:pairs.map(([source,target],i)=>({id:'e'+i,source,target,type:i===2?'abolishes':'cites'}))};
const svg={children:[],setAttribute(){}},elements=new Map();
const context=vm.createContext({
  focus,nodes:new Map(graph.nodes.map(n=>[n.id,n])),svg,
  document:{getElementById(id){if(!elements.has(id))elements.set(id,{});return elements.get(id);}},
  visibleEdges:()=>graph.edges.filter(e=>e.type!=='mentions'),
  sv(tag,attrs,parent){const element={tag,attrs,style:{}};parent.children.push(element);return element;},
  drawNode(){},relationList(){},showEdge(){},edgeColor:()=>'',edgeMarker:()=>'',dash:()=>'',
  resolutionName:{},validityName:{},typeName:{}
});
vm.runInContext(source.slice(source.indexOf('function drawLocal()'),source.indexOf('function overviewLayout('))+'\ndrawLocal();',context);
const paths=svg.children.filter(e=>e.tag==='path');
const incoming=new Set(graph.edges.filter(e=>e.type==='cites'&&e.target===focus).map(e=>e.id));
assert.equal(paths.length,11,'局部图应画出全部十一条直接关系');
assert.equal(paths.filter(p=>incoming.has(p.attrs['data-edge-id'])).length,6,'六条入向引用都应显示');
assert(paths.filter(p=>incoming.has(p.attrs['data-edge-id'])).every(p=>Number(p.attrs.d.split(' ').at(-2))<360),'入向箭头应落在主节点左边界外');
assert.equal(paths.at(-1).attrs['data-edge-id'],'e2','引用应先展示，废止应排在引用后面');
graph.edges[2].review_status='approved';
graph.edges.unshift({id:'pending',source:focus,target:'old',type:'abolishes',review_status:'pending'},{id:'approved',source:'old',target:focus,type:'abolishes',review_status:'approved'});
svg.children.length=0;
vm.runInContext('drawLocal();',context);
assert.deepEqual(svg.children.filter(e=>e.tag==='path').slice(-3).map(e=>e.attrs['data-edge-id']),['approved','e2','pending'],'左右两侧均应按引用、已审核废止、待审核废止排序');
console.log('采购与招标局部图：十一条直接关系、六条入向引用均完整显示');
