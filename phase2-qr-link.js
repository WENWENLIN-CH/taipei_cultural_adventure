// A reusable group QR credential is carried only in a URL fragment.
// Scrub the fragment immediately; the server still verifies group + credential.
export function readAndClearPhase2Qr(location,history){
 const hash=String(location.hash||"");
 if(!hash)return {kind:"absent"};
 history.replaceState(null,"",location.pathname+location.search);
 const m=/^#group=(group0[1-3])&code=([a-f0-9]{48})$/i.exec(hash);
 return m?{kind:"valid",groupId:m[1].toLowerCase(),code:m[2].toLowerCase()}:{kind:"invalid"};
}
export function makePhase2QrUrl(origin,groupId,code){
 if(!/^group0[1-3]$/.test(groupId)||!/^[a-f0-9]{48}$/.test(code))
  throw Error("組別或 QR 憑證格式錯誤");
 const url=new URL("/phase2-student-quest.html",origin);
 if(url.protocol!=="https:"||url.hostname!=="taipei-cultural-adventure.web.app")
  throw Error("只能使用正式 Firebase Hosting 網址");
 return url.origin+url.pathname+`#group=${groupId}&code=${code}`;
}
