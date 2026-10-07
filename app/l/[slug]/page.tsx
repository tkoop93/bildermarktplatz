'use client'

import { useEffect, useMemo, useState } from 'react'

type Pulse = {
  id: string
  name: string
  category: string
  emoji: string
  text: string
  createdAt: number
  expiresAt: number
  reactions: number
  reacted?: boolean
}

const categories = [
  ['🍺','Getränk'], ['💬','Quatschen'], ['👋','Leute kennenlernen'], ['🚴','Sport'],
  ['🎲','Spontan'], ['💡','Ideen'], ['🍽️','Essen'], ['❤️','Flirt']
]

const seed: Pulse[] = [
  { id:'1', name:'Thiemo', category:'Ideen', emoji:'💡', text:'Ich brauche eine gute App-Idee. Wer denkt 10 Minuten mit?', createdAt: Date.now()-2*60_000, expiresAt: Date.now()+78*60_000, reactions:2 },
  { id:'2', name:'Lisa', category:'Getränk', emoji:'🍷', text:'Noch jemand Lust auf ein Glas Wein?', createdAt: Date.now()-7*60_000, expiresAt: Date.now()+53*60_000, reactions:3 },
  { id:'3', name:'Jan', category:'Sport', emoji:'🚴', text:'Wer fährt am Wochenende Rennrad?', createdAt: Date.now()-11*60_000, expiresAt: Date.now()+109*60_000, reactions:2 }
]

function relative(ts:number){
  const m = Math.max(1, Math.floor((Date.now()-ts)/60000))
  return `vor ${m} Min.`
}

export default function PlaceRoom(){
  const [nickname, setNickname] = useState('')
  const [joined, setJoined] = useState(false)
  const [pulses, setPulses] = useState<Pulse[]>(seed)
  const [composer, setComposer] = useState(false)
  const [text, setText] = useState('')
  const [cat, setCat] = useState(categories[5])
  const [minutes, setMinutes] = useState(60)

  useEffect(()=>{
    const n = localStorage.getItem('nebentisch_nickname')
    if(n){ setNickname(n); setJoined(true) }
    const saved = localStorage.getItem('nebentisch_pulses')
    if(saved){
      try { setPulses(JSON.parse(saved).filter((p:Pulse)=>p.expiresAt>Date.now())) } catch {}
    }
  },[])

  const active = useMemo(()=>pulses.filter(p=>p.expiresAt>Date.now()).sort((a,b)=>b.createdAt-a.createdAt),[pulses])

  function persist(next:Pulse[]){ setPulses(next); localStorage.setItem('nebentisch_pulses', JSON.stringify(next)) }
  function join(){ if(!nickname.trim()) return; localStorage.setItem('nebentisch_nickname', nickname.trim()); setJoined(true) }
  function add(){
    if(!text.trim()) return
    const p:Pulse = { id: crypto.randomUUID(), name:nickname || 'Gast', category:cat[1], emoji:cat[0], text:text.trim().slice(0,120), createdAt:Date.now(), expiresAt:Date.now()+minutes*60_000, reactions:0 }
    persist([p,...pulses]); setText(''); setComposer(false)
  }
  function react(id:string){
    persist(pulses.map(p=> p.id===id ? {...p, reactions:p.reactions+(p.reacted?-1:1), reacted:!p.reacted}:p))
  }

  if(!joined){
    return <main className="shell room">
      <div className="placeTag">LOWINEREI · MÜNSTER</div>
      <h1>Du bist hier.</h1>
      <p className="lead">Schau, was am Nebentisch gerade geht.</p>
      <div className="card joinCard">
        <label>Wie sollen dich die anderen sehen?</label>
        <input autoFocus maxLength={24} placeholder="Dein Vorname oder Nickname" value={nickname} onChange={e=>setNickname(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} />
        <button className="primary" onClick={join}>Am Nebentisch teilnehmen</button>
        <p className="fine">Für den MVP kein Konto und keine E-Mail nötig.</p>
      </div>
    </main>
  }

  return <main className="shell room">
    <header className="roomHeader">
      <div><p className="eyebrow">NEBENTISCH</p><h2>Lowinerei</h2></div>
      <div className="live"><span/>8 hier</div>
    </header>
    <div className="nowBar">Mittwochabend · nur Beiträge, die noch aktuell sind</div>

    <section className="feed">
      {active.map(p=><article className="pulse card" key={p.id}>
        <div className="pulseTop"><div className="avatar">{p.emoji}</div><div><strong>{p.name}</strong><span>{relative(p.createdAt)} · {p.category}</span></div></div>
        <p>{p.text}</p>
        <button className={p.reacted?'reaction active':'reaction'} onClick={()=>react(p.id)}>🙋 Bin dabei {p.reactions>0 && <b>{p.reactions}</b>}</button>
      </article>)}
    </section>

    <button className="fab" onClick={()=>setComposer(true)}>＋ Was geht bei dir?</button>

    {composer && <div className="overlay" onClick={()=>setComposer(false)}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheetHandle"/>
        <h3>Was geht bei dir?</h3>
        <div className="chips">{categories.map(c=><button key={c[1]} className={cat[1]===c[1]?'chip selected':'chip'} onClick={()=>setCat(c)}>{c[0]} {c[1]}</button>)}</div>
        <textarea maxLength={120} autoFocus placeholder="Zum Beispiel: Wer denkt 10 Minuten bei einer App-Idee mit?" value={text} onChange={e=>setText(e.target.value)} />
        <div className="counter">{text.length}/120</div>
        <label className="duration">Wie lange bist du noch hier?
          <select value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>
            <option value={30}>30 Minuten</option><option value={60}>1 Stunde</option><option value={120}>2 Stunden</option>
          </select>
        </label>
        <button className="primary" onClick={add}>Impuls posten</button>
      </div>
    </div>}
  </main>
}
