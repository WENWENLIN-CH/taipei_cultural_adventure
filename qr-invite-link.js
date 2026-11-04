// Pure client helper: QR links carry the one-time token in a URL fragment.
// Fragments are not sent with the HTTP request. Immediately remove it from
// the visible URL before performing any Firebase or network operations.
export const QR_FRAGMENT_KEY="join";
export const TOKEN_RE=/^[a-f0-9]{48}$/i;
export function readAndClearQrInvite(location,history){
 const hash=String(location.hash||"");
 if(!hash)return {kind:"absent",token:null};
 // Only accept a single fragment key. Never process URL query params.
 const match=/^#join=([a-fA-F0-9]{48})$/.exec(hash);
 // Remove ANY fragment on this dedicated page, including invalid or altered
 // credentials; never leave an untrusted invitation in browser history.
 history.replaceState(null,"",location.pathname+location.search);
 if(!match)return {kind:"invalid",token:null};
 return {kind:"valid",token:match[1].toLowerCase()};
}
export function makeQrJoinUrl(origin,token){
 if(!TOKEN_RE.test(token))throw Error("加入碼格式不正確（48 位十六進位字元）");
 const url=new URL("/pilot2026-qr-join.html",origin);
 if(url.protocol!=="https:" ||
  !/^taipei-cultural-adventure(?:--auth-test-[a-z0-9]+)?[.]web[.]app$/.test(url.hostname))
  throw Error("只允許指定 Firebase Hosting 網址，不接受第三方 QR 產碼網站");
 return url.origin+url.pathname+"#"+QR_FRAGMENT_KEY+"="+token.toLowerCase();
}
