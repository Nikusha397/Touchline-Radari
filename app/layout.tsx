import type { Metadata } from "next";

import {SITE_URL} from '../lib/seo';

import "./radar.css";

import "./fonts.css";

import "./agent-radar.css";
import "./discovery.css";
import "./editorial.css";
import "./shortlist-cart.css";
import "./network/network.css";
import "./community.css";
import "./site-shell.css";

import {StructuredData} from './public-content';



export const metadata: Metadata = {

  metadataBase:new URL(SITE_URL),

  title: "TOUCHLINE Radar | Find Football Representation",

  description: "Browse football agents and agencies by country. Build your player profile, send introductions for $0.50 each and unlock published contacts.",

  verification:{google:['f1BXv1iG9qxeeUtcCp1Ia88t5RY-6E9vf6uhwSA2e88','JNboEQ_88MhJxPAnSYGTZV7_HwuYV1b58VHkPH9BdlE']},

  icons: {

    icon: "/favicon.svg",

    shortcut: "/favicon.svg",
    apple: "/press/brand-square.png",

  },

};



export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {

  return (

    <html lang="en">

      <body className="antialiased"><StructuredData data={{'@context':'https://schema.org','@type':'Organization','@id':SITE_URL+'/#organization',name:'TOUCHLINE Radar',url:SITE_URL,logo:SITE_URL+'/press/brand-square.png',email:'contact@touchlineradar.com',sameAs:['https://www.instagram.com/touchline_radar/','https://x.com/TOUCHLINEradar','https://www.tiktok.com/@touchlineradar','https://www.linkedin.com/in/touchline-radar-81910a442/']}}/>{children}</body>

    </html>

  );

}

