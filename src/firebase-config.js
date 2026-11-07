export const FIREBASE_PROJECT='pokemon-eternal';
// Existing Enterprise Native database. "default" and "(default)" are distinct IDs.
export const FIREBASE_DATABASE='default';
export function validateFirebaseConfig(config){
 if(!config?.apiKey)return null;
 if(config.projectId!==FIREBASE_PROJECT||config.authDomain!=='pokemon-eternal.firebaseapp.com'||config.appId!=='1:21127618866:web:0a65a5478d53216db9b72b')throw Object.assign(Error('배포된 Firebase 설정이 pokemon-eternal 웹 앱과 일치하지 않습니다.'),{code:'config/project-mismatch'});
 return config;
}
// Read-only server snapshots avoid a transaction commit/verify for missing player documents.
// All chunk and metadata revisions must agree; mixed reads are retried, never accepted.
export async function readCloudSnapshot(read){
 for(let attempt=0;attempt<3;attempt++){
  const head=await read(null);if(!head)return null;
  if(head.schema!==1||!Number.isInteger(head.chunks)||head.chunks<1||head.chunks>200||!Number.isInteger(head.revision)||head.revision<1)throw Error('invalid-cloud-save');
  const parts=await Promise.all(Array.from({length:head.chunks},(_,n)=>read(n)));
  const latest=await read(null);
  if(latest?.revision===head.revision&&latest?.chunks===head.chunks&&parts.every(p=>p&&p.revision===head.revision&&typeof p.text==='string'))return {revision:head.revision,payload:parts.map(p=>p.text).join('')};
 }
 throw Error('inconsistent-cloud-save');
}
