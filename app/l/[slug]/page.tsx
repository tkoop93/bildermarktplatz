'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

type Place = { id: string; slug: string; name: string; city: string | null }

const categories = [
  ['🍺','Getränk'], ['💬','Quatschen'], ['👋','Leute kennenlernen'], ['🚴','Sport'],
  ['🎲','Spontan'], ['💡','Ideen'], ['🍽️','Essen'], ['❤️','Flirt']
] as const

const demoSeed: Pulse[] = [
  { id:'demo-1', name:'Thiemo', category:'Ideen', emoji:'💡', text:'Ich brauche eine gute App-Idee. Wer denkt 10 Minuten mit?', createdAt: Date.now()-2*60_000, expiresAt: Date.now()+78*60_000, reactions:2 },
  { id:'demo-2', name:'Lisa', category:'Getränk', emoji:'🍷', text:'Noch jemand Lust auf ein Glas Wein?', createdAt: Date.now()-7*60_000, expiresAt: Date.now()+53*60_000, reactions:3 },
  { id:'demo-3', name:'Jan', category:'Sport', emoji:'🚴', text:'Wer fährt am Wochenende Rennrad?', createdAt: Date.now()-11*60_000, expiresAt: Date.now()+109*60_000, reactions:2 }
]

function relative(ts:number){
  const m = Math.max(1, Math.floor((Date.now()-ts)/60000))
  return `vor ${m} Min.`
}

function getClientId(){
  let id = localStorage.getItem('nebentisch_client_id')
  if(!id){
    id = crypto.randomUUID()
    localStorage.setItem('nebentisch_client_id', id)
  }
  return id
}

export default function PlaceRoom(){
  const params = useParams<{slug:string}>()
  const slug = params?.slug || 'lowinerei'
  const [nickname, setNickname] = useState('')
  const [joined, setJoined] = useState(false)
  const [pulses, setPulses] = useState<Pulse[]>([])
  const [place, setPlace] = useState<Place | null>(null)
  const [composer, setComposer] = useState(false)
  const [text, setText] = useState('')
  const [cat, setCat] = useState<(typeof categories)[number]>(categories[5])
  const [minutes, setMinutes] = useState(60)
  const [online, setOnline] = useState(1)
  const [status, setStatus] = useState<'connecting'|'live'|'demo'>('connecting')
  const clientIdRef = useRef('')

  useEffect(()=>{
    const n = localStorage.getItem('nebentisch_nickname')
    if(n){ setNickname(n); setJoined(true) }
    clientIdRef.current = getClientId()
  },[])

  useEffect(()=>{
    if(!supabase){
      setStatus('demo')
      const saved = localStorage.getItem(`nebentisch_pulses_${slug}`)
      if(saved){
        try { setPulses(JSON.parse(saved).filter((p:Pulse)=>p.expiresAt>Date.now())) } catch { setPulses(demoSeed) }
      } else setPulses(demoSeed)
      setPlace({id:'demo',slug,name:slug==='lowinerei'?'Lowinerei':slug,city:slug==='lowinerei'?'Münster':null})
      return
    }

    let cancelled = false
    let channel:any

    async function load(){
      const { data: placeData, error: placeError } = await supabase!
        .from('places').select('id,slug,name,city').eq('slug',slug).single()
      if(cancelled) return
      if(placeError || !placeData){ setStatus('demo'); setPulses(demoSeed); return }
      setPlace(placeData)

      const refresh = async ()=>{
        const { data } = await supabase!
          .from('pulses')
          .select('id,nickname,category,emoji,body,created_at,expires_at,reactions(id,client_id)')
          .eq('place_id',placeData.id)
          .gt('expires_at',new Date().toISOString())
          .order('created_at',{ascending:false})
        if(cancelled || !data) return
        setPulses(data.map((p:any)=>({
          id:p.id, name:p.nickname, category:p.category, emoji:p.emoji, text:p.body,
          createdAt:new Date(p.created_at).getTime(), expiresAt:new Date(p.expires_at).getTime(),
          reactions:p.reactions?.length || 0,
          reacted:(p.reactions || []).some((r:any)=>r.client_id===clientIdRef.current)
        })))
      }

      await refresh()
      setStatus('live')

      channel = supabase!.channel(`place:${placeData.id}`,{config:{presence:{key:clientIdRef.current}}})
        .on('postgres_changes',{event:'*',schema:'public',table:'pulses',filter:`place_id=eq.${placeData.id}`},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'reactions'},refresh)
        .on('presence',{event:'sync'},()=>{
          const state = channel.presenceState()
          setOnline(Math.max(1,Object.keys(state).length))
        })
        .subscribe(async (s:string)=>{
          if(s==='SUBSCRIBED'){
            await channel.track({nickname:localStorage.getItem('nebentisch_nickname') || 'Gast', at:new Date().toISOString()})
          }
        })
    }

    load()
    return ()=>{ cancelled=true; if(channel) supabase!.removeChannel(channel) }
  },[slug])

  useEffect(()=>{
    if(status!=='live' || !joined || !supabase || !place || place.id==='demo') return
    const channel = supabase.channel(`presence-refresh:${place.id}:${clientIdRef.current}`,{config:{presence:{key:clientIdRef.current}}})
    channel.subscribe(async (s:string)=>{
      if(s==='SUBSCRIBED') await channel.track({nickname,at:new Date().toISOString()})
    })
    return ()=>{ supabase.removeChannel(channel) }
  },[joined,nickname,place,status])

  const active = useMemo(()=>pulses.filter(p=>p.expiresAt>Date.now()).sort((a,b)=>b.createdAt-a.createdAt),[pulses])

  function join(){
    if(!nickname.trim()) return
    localStorage.setItem('nebentisch_nickname', nickname.trim())
    setNickname(nickname.trim())
    setJoined(true)
  }

  async function add(){
    if(!text.trim()) return
    if(status==='live' && supabase && place && place.id!=='demo'){
      const { error } = await supabase.from('pulses').insert({
        place_id:place.id, nickname:nickname || 'Gast', category:cat[1], emoji:cat[0],
        body:text.trim().slice(0,120), expires_at:new Date(Date.now()+minutes*60_000).toISOString()
      })
      if(error) return
    } else {
      const p:Pulse = { id:crypto.randomUUID(), name:nickname||'Gast', category:cat[1], emoji:cat[0], text:text.trim().slice(0,120), createdAt:Date.now(), expiresAt:Date.now()+minutes*60_000, reactions:0 }
      const next=[p,...pulses]
      setPulses(next)
      localStorage.setItem(`nebentisch_pulses_${slug}`,JSON.stringify(next))
    }
    setText('')
    setComposer(false)
  }

  async function react(p:Pulse){
    if(status==='live' && supabase && !p.id.startsWith('demo-')){
      if(p.reacted){
        await supabase.from('reactions').delete().eq('pulse_id',p.id).eq('client_id',clientIdRef.current)
      }else{
        await supabase.from('reactions').insert({pulse_id:p.id,client_id:clientIdRef.current})
      }
      return
    }
    const next=pulses.map(x=>x.id===p.id?{...x,reactions:x.reactions+(x.reacted?-1:1),reacted:!x.reacted}:x)
    setPulses(next)
    localStorage.setItem(`nebentisch_pulses_${slug}`,JSON.stringify(next))
  }

  const placeName = place?.name || (slug==='lowinerei'?'Lowinerei':slug)
  const city = place?.city || ''

  if(!joined){
    return <main className="shell room">
      <div className="placeTag">{placeName.toUpperCase()}{city ? ` · ${city.toUpperCase()}` : ''}</div>
      <h1>Du bist hier.</h1>
      <p className="lead">Schau, was am Nebentisch gerade geht.</p>
      <div className="card joinCard">
        <label>Wie sollen dich die anderen sehen?</label>
        <input autoFocus maxLength={24} placeholder="Dein Vorname oder Nickname" value={nickname} onChange={e=>setNickname(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} />
        <button className="primary" onClick={join}>Am Nebentisch teilnehmen</button>
        <p className="fine">Kein Konto, keine E-Mail. Dein Nickname bleibt auf diesem Gerät.</p>
      </div>
    </main>
  }

  return <main className="shell room">
    <header className="roomHeader">
      <div><p className="eyebrow">NEBENTISCH · {status==='live'?'LIVE':'DEMO'}</p><h2>{placeName}</h2></div>
      <div className="live"><span/>{online} hier</div>
    </header>
    <div className="nowBar">{status==='live'?'Live synchronisiert · ':''}nur Beiträge, die noch aktuell sind</div>

    <section className="feed">
      {active.length===0 && <article className="pulse card"><p>Noch ruhig hier. Setz den ersten Impuls am Nebentisch.</p></article>}
      {active.map(p=><article className="pulse card" key={p.id}>
        <div className="pulseTop"><div className="avatar">{p.emoji}</div><div><strong>{p.name}</strong><span>{relative(p.createdAt)} · {p.category}</span></div></div>
        <p>{p.text}</p>
        <button className={p.reacted?'reaction active':'reaction'} onClick={()=>react(p)}>🙋 Bin dabei {p.reactions>0 && <b>{p.reactions}</b>}</button>
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
