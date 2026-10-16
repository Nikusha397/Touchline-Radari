'use client';

import {useState} from 'react';
import {Star} from 'lucide-react';

function StarIcon({fill=0}:{fill?:number}){
 return <span className="rating-star-icon" aria-hidden="true"><Star className="rating-star-outline"/><span className="rating-star-fill" style={{width:`${fill*100}%`}}><Star/></span></span>;
}

export function RatingStars({value,count,label='Rating'}:{value:number|null;count?:number;label?:string}){
 const score=value===null?0:Math.min(5,Math.max(0,value));
 return <span className="visual-rating" role="img" aria-label={`${label}: ${value===null?'not rated':`${value.toFixed(1)} out of 5`}${count===undefined?'':`, ${count} reviews`}`} title={`${label}: ${value===null?'not rated':`${value.toFixed(1)} / 5`}`}><span className="rating-star-strip">{[0,1,2,3,4].map(i=><StarIcon key={i} fill={Math.min(1,Math.max(0,score-i))}/>)}</span>{count!==undefined&&<span className="rating-review-count">({count})</span>}</span>;
}

export function StarPicker({initialValue=0,disabled=false}:{initialValue?:number;disabled?:boolean}){
 const [selected,setSelected]=useState(initialValue),[hover,setHover]=useState(0);
 return <fieldset className="star-picker" disabled={disabled}><legend>Your rating</legend><div className="star-picker-options" onMouseLeave={()=>setHover(0)}>{[1,2,3,4,5].map(n=><label key={n} className="star-picker-option" onMouseEnter={()=>setHover(n)}><input type="radio" name="stars" value={n} required checked={selected===n} onChange={()=>{setSelected(n);setHover(0)}} aria-label={`${n} ${n===1?'star':'stars'}`}/><StarIcon fill={n<=(hover||selected)?1:0}/></label>)}</div></fieldset>;
}
