"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="state-page"><span>!</span><h1>Something went wrong</h1><p>We could not complete that request. Your work is still safe.</p><button className="button" onClick={reset}>Try again</button></main>}
