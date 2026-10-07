import Link from 'next/link'

export default function Home() {
  return (
    <main className="shell landing">
      <div className="brandMark">N</div>
      <p className="eyebrow">NEBENTISCH</p>
      <h1>Wer hier ist,<br/>ist nicht weit.</h1>
      <p className="lead">Spontane Gespräche, Ideen und Verabredungen mit Menschen, die gerade am selben Ort sind.</p>
      <Link className="primary" href="/l/lowinerei">Demo in der Lowinerei öffnen</Link>
      <p className="fine">Kein Dating-Zwang. Kein endloser Feed. Nur das, was jetzt gerade geht.</p>
    </main>
  )
}
