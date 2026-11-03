// Pure client retry decision. No Firebase SDK imports.
// Existing immutable photo slots are reusable only for exact identical bytes.
export function evaluateExistingPhoto(metadata, {sha256,bytes}) {
  if(!metadata || typeof metadata!=="object" ||
     metadata.contentType!=="image/jpeg" ||
     !Number.isInteger(bytes) || bytes<=0 || bytes>1024*1024 ||
     Number(metadata.size)!==bytes ||
     !/^[a-f0-9]{64}$/.test(sha256) ||
     metadata.customMetadata?.sha256!==sha256) {
    throw new Error("此欄位已有不同照片，不能覆蓋。請聯絡老師處理補拍。");
  }
  return true;
}
export function shouldUploadAfterReadError(error) {
  if(error?.code==="storage/object-not-found") return true;
  throw error instanceof Error ? error : new Error("無法驗證既有照片");
}
