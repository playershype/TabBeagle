/**
 * Derive Android Metro JS module reachability from generated source maps.
 * Does not modify project dependencies or count audited packages as "fixed".
 * A source-map absence or unexpected structure FAILS CLOSED.
 * Report stores package names/counts/hashes only, not source code, secrets, or PII.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bundleDir=path.join(project,'dist');
const dependencyReport=JSON.parse(fs.readFileSync(path.join(project,'m1-security-audit.json'),'utf8'));
if(!fs.existsSync(bundleDir)) throw new Error('No Android export directory; do not claim bundle inspected.');
const maps=[],compiled=[];
function walk(directory){
 for(const item of fs.readdirSync(directory,{withFileTypes:true})){
  const full=path.join(directory,item.name);
  if(item.isDirectory())walk(full);
  else if(item.name.endsWith('.map'))maps.push(full);
  else if(item.name.endsWith('.hbc')||item.name.endsWith('.js'))compiled.push(full);
 }
}
walk(bundleDir);
const androidMaps=maps.filter(p=>p.includes('/android/')||p.includes('android.'));
if(!androidMaps.length) throw new Error('Android source map missing: no runtime dependency classification possible.');
const items=new Set(),packageModules=new Map(),allSourceSamples=[];
for(const p of androidMaps){
 const map=JSON.parse(fs.readFileSync(p,'utf8'));
 if(!Array.isArray(map.sources)||map.sources.length<20)throw new Error('Incomplete Android Metro source map '+path.basename(p));
 for(const untrusted of map.sources){
  const src=String(untrusted).replaceAll('\\','/');
  allSourceSamples.push(src);
  const match=src.match(/(?:^|\\/)node_modules\\/((?:@[^/]+\\/)?[^/]+)/);
  if(!match)continue;
  const name=match[1];
  items.add(name);
  packageModules.set(name,(packageModules.get(name)||0)+1);
 }
}
if(!packageModules.has('react-native')||packageModules.size<15){
 throw new Error('Android source map lacks expected React Native modules; do not make absence claims.');
}
const alerts=dependencyReport.vulnerabilities||{};
const analyzed=Object.entries(alerts).map(([name,item])=>({
 name,severity:item.severity,
 presentInMetroJavascriptSourceMap:items.has(name),
 matchedSourceModules:packageModules.get(name)||0,
 conclusion:items.has(name)?'JS_SOURCES_PRESENT_NOT_AN_EXPLOITABILITY_ASSESSMENT':'NOT_IN_EXPORTED_JS_SOURCES'
})).sort((a,b)=>a.name.localeCompare(b.name));
if(!analyzed.length)throw new Error('Missing npm audit findings, cannot verify reachability');
const generatedBundle=compiled.filter(p=>p.includes('/android/')||p.includes('android.'));
if(!generatedBundle.length)throw new Error('No exported Android executable JS or Hermes bundle found');
const bundles=generatedBundle.map(p=>({name:path.relative(bundleDir,p),bytes:fs.statSync(p).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
// Source-map signals specifically explain what ends up in Metro JavaScript.
// They say nothing about native APK AARs, bundled resource files, or JS installed as dev-only.
const result={
 scope:'ANDROID_JS_EXPORT_ONLY_NO_NATIVE_APK_ASSERTION',
 auditBaseline:dependencyReport.metadata?.vulnerabilities,
 androidSourceMaps:androidMaps.map(p=>path.relative(bundleDir,p)),
 totalSourceEntries:allSourceSamples.length,
 uniqueNodePackages:items.size,
 signedInRuntimeAuthPolicy:'NO_JWT_OR_SECRETS_READ_OR_REPORTED',
 reportedVulnerablePackages:analyzed,
 presentCount:analyzed.filter(x=>x.presentInMetroJavascriptSourceMap).length,
 absentCount:analyzed.filter(x=>!x.presentInMetroJavascriptSourceMap).length,
 bundleHashes:bundles,
 caveats:[
  'Presence in a bundle does not demonstrate that a vulnerable code path is reachable or exploitable.',
  'Absence from Metro JS source maps does not cover Android native modules, build pipeline compromise, or APK resources.',
  'No static dependency audit warning is suppressed. This report provides separate reproducible runtime JS inclusion evidence.',
  'Npm audit findings can be umbrella packages: inspect each advisory and loaded code before risk waivers.'
 ]
};
fs.writeFileSync(path.join(project,'m1-android-bundle-reachability.json'),JSON.stringify(result,null,2)+'\\n');
console.log('M1_JS_BUNDLE_REACHABILITY',JSON.stringify({
 maps:result.androidSourceMaps.length,sourceEntries:result.totalSourceEntries,distinctPackages:items.size,
 auditedNames:analyzed.length,present:result.presentCount,absent:result.absentCount,
 presentNames:analyzed.filter(x=>x.presentInMetroJavascriptSourceMap).map(x=>x.name),
 absentNames:analyzed.filter(x=>!x.presentInMetroJavascriptSourceMap).map(x=>x.name)
}));
