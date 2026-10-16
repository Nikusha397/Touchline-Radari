import { introductionCertification, type Player } from "./agent-product";

// The editable player message is always escaped; the platform certification is added only by the server.
function escapeHTML(value: string) {
  return value.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]!));
}

export function introductionEmail(player: Player, message: string, reference: string) {
  const name = `${player.firstName} ${player.lastName}`.trim();
  const subject = `Representation enquiry: ${name} · ${player.position}`.replace(/[\r\n]+/g, " ");
  const body = message.trim();
  const {title, scope, replies} = introductionCertification;
  const text = `${body}\n\n—\n${title}\n${scope}\n\n${replies}\nSubmission reference: ${reference}\nhttps://touchlineradar.com`;
  const paragraphs = body.split(/\n\s*\n/).map(paragraph => `<p dir="auto" style="margin:0 0 22px;font-size:16px;line-height:27px;color:#24382b;overflow-wrap:anywhere;word-break:break-word">${escapeHTML(paragraph).replace(/\r?\n/g, "<br>")}</p>`).join("");
  const html = `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f5ef;font-family:Arial,Helvetica,sans-serif">
<div lang="en" dir="ltr" style="display:none;max-height:0;overflow:hidden;mso-hide:all">A personal introduction from ${escapeHTML(name)} · ${escapeHTML(player.position)}. Submitted through TOUCHLINE Radar.</div>
<table lang="en" dir="ltr" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5ef"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #dce1d7">
<tr><td style="padding:28px;background-color:#203629;border-bottom:3px solid #d8ff5f">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="52" style="vertical-align:middle"><img src="https://touchlineradar.com/press/brand-square.png" width="40" height="40" alt="" style="display:block;border:0"></td><td style="vertical-align:middle;color:#ffffff;font-size:13px;font-weight:bold;letter-spacing:2px;line-height:22px">TOUCHLINE<br><span style="font-family:Georgia,serif;font-size:25px;font-style:italic;font-weight:normal;letter-spacing:0">Radar.</span></td></tr></table>
</td></tr>
<tr><td style="padding:32px 28px 26px;background-color:#f8f9f3;border-bottom:1px solid #e1e5da">
<p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:2px;line-height:18px;color:#4f6446">OFFICIAL PLAYER INTRODUCTION</p>
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:32px;line-height:39px;font-weight:normal;color:#203629;overflow-wrap:anywhere;word-break:break-word">${escapeHTML(name)}</h1>
<p style="margin:0;font-size:14px;line-height:23px;color:#4c604a">${escapeHTML(player.position)} &nbsp;·&nbsp; ${escapeHTML(player.nationality)}</p>
</td></tr>
<tr><td style="padding:30px 28px 8px">${paragraphs}</td></tr>
<tr><td style="padding:0 28px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eff3e8;border:1px solid #d8e0cd"><tr><td style="padding:22px">
<h2 style="margin:0 0 10px;font-family:Georgia,serif;font-size:20px;line-height:26px;font-weight:normal;color:#203629">${title}</h2>
<p style="margin:0;font-size:12px;line-height:20px;color:#4c604a">${scope}</p>
</td></tr></table></td></tr>
<tr><td style="padding:24px 28px;background-color:#f8f9f3;border-top:1px solid #e1e5da">
<p style="margin:0 0 10px;font-size:14px;line-height:22px;color:#24382b">${replies}</p>
<p style="margin:0 0 14px;font-size:11px;line-height:18px;color:#4c604a;overflow-wrap:anywhere;word-break:break-word">Submission reference: ${escapeHTML(reference)}</p>
<a href="https://touchlineradar.com" style="font-size:12px;line-height:20px;color:#324c36;text-decoration:underline">Visit TOUCHLINE Radar</a>
</td></tr>
</table></td></tr></table></body></html>`;
  return {subject, text, html};
}
