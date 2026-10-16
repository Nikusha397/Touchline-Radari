import {copyFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
for(const [example,target] of [['../lib/directory.example.json','../lib/directory.server.json'],['../lib/seed.example.ts','../lib/seed.ts'],['../lib/additional-seeds.example.ts','../lib/additional-seeds.ts']]){
 const src=fileURLToPath(new URL(example,import.meta.url)),dst=fileURLToPath(new URL(target,import.meta.url));
 if(!existsSync(dst)){copyFileSync(src,dst);console.log('Prepared contact-free example: '+target);}
}
