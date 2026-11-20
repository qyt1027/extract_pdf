// 直接执行页面使用的纯布局代码，检查方向、环和跨层边，不依赖数据库。
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('policy/web_ui/document_graph.js','utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function overviewLayout('),source.indexOf('function applyCamera(')),context);
function layout(ids,pairs) {
  const nodes=ids.map(id=>({id})),edges=pairs.map(([source,target],i)=>({id:'e'+i,source,target}));
  return {result:context.overviewLayout(nodes,edges),edges};
}
const chain=layout(['a','b','c'],[['a','b'],['b','c'],['a','c']]);
const p=chain.result.positions;
assert(p.get('a').x<p.get('b').x&&p.get('b').x<p.get('c').x,'链式关系应从左向右排列');
assert(chain.result.routes.get('e2').length>2,'跨层边应经过临时布局点');
for(const fixture of [chain,layout(['a','b','c','d'],[['a','c'],['b','c'],['c','d']]),layout(['a','b','c'],[['a','b'],['b','a'],['b','c']]),layout(['a'],[['a','a']]),layout(['a','b','c'],[])]) {
  const {positions,routes}=fixture.result;
  assert.equal(new Set([...positions.values()].map(p=>`${p.x},${p.y}`)).size,positions.size,'环内节点也不能重叠');
  assert([...positions.values()].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  for(const edge of fixture.edges) {
    const route=routes.get(edge.id);
    assert.deepEqual(route[0],positions.get(edge.source));
    assert.deepEqual(route.at(-1),positions.get(edge.target));
    assert(!/NaN|Infinity/.test(context.overviewEdgePath(edge,fixture.result,0)));
  }
}
console.log('分层布局：链、汇聚、环、自环、跨层边及孤立节点检查通过');
// 大量外部目标不能将同一层拉成极高的单列；紧凑排布仍须保持真实边方向。
const fanNodes=Array.from({length:121},(_,i)=>({id:'n'+i}));
const fanEdges=fanNodes.slice(1).map((node,i)=>({id:'f'+i,source:'n0',target:node.id}));
const tall=context.overviewLayout(fanNodes,fanEdges);
const compact=context.overviewLayout(fanNodes,fanEdges,{compact:true});
assert(compact.height<tall.height/2,'密集层应换列，避免挤成超高单列');
assert.equal(compact.positions.size,121);
assert.equal(new Set([...compact.positions.values()].map(p=>`${p.x},${p.y}`)).size,121);
assert(fanEdges.every(edge=>compact.positions.get(edge.source).x<compact.positions.get(edge.target).x));
assert.equal(compact.routes.size,120);
console.log('密集外部目标：换列压缩、节点不重叠、方向和全部关系检查通过');
