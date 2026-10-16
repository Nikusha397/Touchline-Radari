import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import sharp from 'sharp';
import {nodeRuntime} from './node-storage';
export function verificationReady(){return /^[a-f\d]{64}$/i.test(process.env.VERIFICATION_ENCRYPTION_KEY||'');}
function key(){if(!verificationReady())throw Error('Private verification storage is not configured.');return Buffer.from(process.env.VERIFICATION_ENCRYPTION_KEY!,'hex');}
export async function storeEvidence(name:string,base64:string){
 const bytes=Buffer.from(base64,'base64');if(bytes.length>5*1024*1024||bytes.length<12)throw Error('Use a JPEG or PNG up to 5 MB.');
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(!png&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))throw Error('Use a JPEG or PNG image.');
 const clean=await sharp(bytes,{limitInputPixels:25000000}).rotate().resize(2400,2400,{fit:'inside',withoutEnlargement:true}).jpeg({quality:90}).toBuffer();
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(name));
 const encrypted=Buffer.concat([iv,cipher.update(clean),cipher.final(),cipher.getAuthTag()]);
 await nodeRuntime.BUCKET.put(name,new Uint8Array(encrypted).buffer);return name;
}
export async function readEvidence(name:string){const file=await nodeRuntime.BUCKET.get(name);if(!file)return null;const b=Buffer.from(await file.arrayBuffer());const decipher=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));decipher.setAAD(Buffer.from(name));decipher.setAuthTag(b.subarray(-16));return Buffer.concat([decipher.update(b.subarray(12,-16)),decipher.final()]);}
