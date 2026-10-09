/**
 * M1 evidence guard for the current Expo54 TEST security inventory.
 * Fail closed on NEW advisory packages, additional high/critical findings
 * or an incompatible Metro/image-size major replacement.
 *
 * Does not claim that listed high alerts are resolved or unreachable in APK.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const auditFile=process.argv[2]?path.resolve(process.argv[2]):path.join(base,'m1-security-audit.json');
const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(base,'package-lock.json'),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8'));
const expectedNames=new Set([
  '@expo/cli','@expo/code-signing-certificates','@expo/metro','@expo/metro-config',
  '@jest/environment','@jest/fake-timers','@jest/transform','@react-native/community-cli-plugin',
  'babel-jest','braces','expo','image-size','jest-environment-node','jest-haste-map',
  'jest-message-util','metro','metro-config','metro-file-map','metro-transform-worker',
  'micromatch','node-forge','react-native','@expo/config','@expo/config-plugins',
  '@expo/prebuild-config','@istanbuljs/load-nyc-config','argparse','babel-plugin-istanbul',
  'expo-asset','expo-constants','expo-linking','js-yaml','sprintf-js','uuid','xcode'
]);
const notes={
  'image-size':'Metro JS transformer loads PNG assets at build time; runtime inclusion not established',
  'node-forge':'Expo CLI and Expo code-signing-certificates; certificate verification exposure needs review',
  'braces':'micromatch dependency; repository/CI inputs should remain trusted',
  'uuid':'xcode tooling; Android APK reachability not established',
  'sprintf-js':'Istanbul test tooling; Android APK reachability not established',
  'js-yaml':'Expo pretty-printing plus Istanbul test configuration; installed baseline 3.15.2 and 4.3.2'
};
const counts=audit.metadata?.vulnerabilities;
const vulnerabilities=audit.vulnerabilities||{};
const bad=Object.entries(vulnerabilities).filter(([name])=>!expectedNames.has(name)).map(([name])=>name);
if(!counts||!Number.isInteger(counts.high)||!Number.isInteger(counts.total))throw Error('Invalid security scanner output');
const versions={};
const direct={};
for(const name of expectedNames) {
  versions[name]=Object.entries(lock.packages).filter(([id])=>id==='node_modules/'+name||id.endsWith('/node_modules/'+name)).map(([id,data])=>({path:id,version:data.version}));
  direct[name]=Boolean(vulnerabilities[name]?.isDirect);
}
const image=lock.packages['node_modules/image-size'];
const metro=lock.packages['node_modules/metro'];
const guarded=[
  ['Expo SDK54 pinned',pkg.dependencies?.expo?.startsWith('~54.')],
  ['React Native 0.81 baseline',pkg.dependencies?.['react-native']==='0.81.5'],
  ['PostCSS 8.5.23 documented isolated override',pkg.overrides?.postcss==='8.5.23'],
  ["Metro's expected image-size 1.x API preserved",Boolean(metro?.dependencies?.['image-size']?.startsWith('^1.') && image?.version?.startsWith('1.'))]
].map(([name,passed])=>({name,passed:Boolean(passed)}));
const report={
  scope:'ISOLATED_TEST_BRANCH; advisory baseline, not production certification',
  date:new Date().toISOString(),
  baseline:{critical:0,high:22,moderate:13,total:35},
  observed:counts,
  recognizedAdvisoryPackages:expectedNames.size,
  newlyNamedAdvisories:bad,
  compatibleBaselineChecks:guarded,
  relevantDependencyPaths:Object.entries(notes).map(([name,assessment])=>({
    name,installed:versions[name],direct:direct[name],
    auditSeverity:vulnerabilities[name]?.severity??'not reported',
    assessment
  })),
  caveat:'npm audit counts include Expo/Metro/Jest build tools; this report is NOT an APK module reachability proof or a waiver of reported advisories'
};
fs.writeFileSync(path.join(base,'m1-risk-guard-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('M1_ANDROID_SECURITY_EVIDENCE',JSON.stringify({
  baseline:report.baseline,observed:counts,newlyNamedAdvisories:bad,
  compatibleBaselineChecks:guarded,
  vulnerableNames:Object.keys(vulnerabilities).length
}));
if(counts.critical>0||counts.high>22||counts.total>35||bad.length||guarded.some(x=>!x.passed)) {
  process.exitCode=1;
  console.error('M1_ANDROID_SECURITY_REGRESSION_REVIEW_REQUIRED: stop; never bypass with npm audit fix --force');
} else console.log('M1_ANDROID_BASELINE_NONREGRESSION_PASS_STILL_NOT_FULLY_REMEDIATED');
