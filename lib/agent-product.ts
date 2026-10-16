export const bundles = [

  { credits: 5, cents: 250, saving: 0, label: "Kick-off" },

  { credits: 20, cents: 900, saving: 10, label: "Build momentum" },

  { credits: 50, cents: 2000, saving: 20, label: "Expand your reach" },

  { credits: 100, cents: 3500, saving: 30, label: "Go all in" },

];

export const introductionBundles=[1,5,20,50,100].map(credits=>({credits,cents:credits*50,saving:0,label:credits===1?'One introduction':credits===5?'Kick-off':credits===20?'Build momentum':credits===50?'Expand your reach':'Go all in'}));

export type CreditPurpose='unlock'|'introduction';

export type Recipient = {
  community?: {count:number;average:number|null};
  overall?: {score:number;players?:number;topTierPlayers?:number;marketValueEur:number;sourceName:string;sourceUrl:string;checkedAt:string;methodology:string;sourceMode?:'direct'|'indexed_snapshot';sourceNote?:string}|null;
  identityUnlocked?: boolean;
  unlockCredits?: number;
  rating?: { score: number; reviewCount: number; sourceName: string; checkedAt: string; sourceUrl?: string } | null;

  id: string; kind: "agency" | "agent"; name: string; country: string; countryCode: string;

  agency: string; status: string; licence: string; checked: string; hasPhone: boolean;

  destinationKey: string;

};

export type Player = {

  firstName: string; lastName: string; nationality: string; position: string;

  club: string; height: string; foot: string; transfermarkt: string; video: string; bio: string;

};

export const emptyPlayer: Player = {firstName:"",lastName:"",nationality:"",position:"",club:"",height:"",foot:"",transfermarkt:"",video:"",bio:""};

export function ageOn(dob: string, today = new Date()) {

  const d = new Date(dob + "T12:00:00Z");

  if (!dob || Number.isNaN(d.getTime())) return NaN;

  return today.getUTCFullYear()-d.getUTCFullYear() - (today.getUTCMonth()<d.getUTCMonth() || (today.getUTCMonth()===d.getUTCMonth() && today.getUTCDate()<d.getUTCDate()) ? 1:0);

}

export function profileReady(p: Player) {return !!(p.firstName.trim() && p.lastName.trim() && p.nationality && p.position);}

export function messageFor(p: Player, hasAttachments = false) {
  const name = `${p.firstName || "[first name]"} ${p.lastName || "[last name]"}`;
  const overview = [
    `Position: ${p.position || "[position]"}`,
    `Nationality: ${p.nationality || "[nationality]"}`,
    p.club && `Current club / status: ${p.club}`,
    p.height && `Height: ${p.height} cm`,
    p.foot && `Preferred foot: ${p.foot}`,
  ].filter(Boolean).join("\n");
  const links = [p.transfermarkt && `Transfermarkt: ${p.transfermarkt}`, p.video && `Match footage / highlights: ${p.video}`].filter(Boolean).join("\n");
  return [
    "Dear Representation Team,",
    `My name is ${name}, and I am seeking professional representation for the next stage of my football career. I would welcome the opportunity to present my profile and discuss potential representation.`,
    `PLAYER OVERVIEW\n${overview}`,
    p.bio.trim(),
    links,
    hasAttachments ? "Please find my player documents attached for your consideration." : "I would be pleased to provide my player CV and further information on request.",
    "Should my profile be of interest, I would welcome a conversation about my experience, ambitions and next steps.",
    "Thank you for your time and consideration.",
    `Kind regards,\n${name}`,
  ].filter(Boolean).join("\n\n");
}

export const introductionCertification = {
  title: "Certified by TOUCHLINE Radar",
  scope: "TOUCHLINE Radar certifies that this introduction was submitted through its platform at the player's request. This certification covers the origin of the message only; player-provided information and documents have not been independently verified.",
  replies: "Reply directly to this email to contact the player.",
};

