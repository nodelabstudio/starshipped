'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Receipt = { ship: string; destination: string; jobId: number };

export function DispatchReceipt() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function departed(event: Event) {
      const detail = (event as CustomEvent<Receipt>).detail;
      setReceipt(detail);
      clearTimeout(timer);
      timer = setTimeout(() => setReceipt(null), 8000);
    }
    window.addEventListener('starshipped:departed', departed);
    return () => { window.removeEventListener('starshipped:departed', departed); clearTimeout(timer); };
  }, []);
  return receipt ? <div className="dispatch-receipt" role="status"><div className="receipt-flight" aria-hidden="true"><span>➤</span></div><div><small>Departure confirmed</small><strong>{receipt.ship}</strong><p>Underway to {receipt.destination}.</p><Link href={`/jobs/${receipt.jobId}`}>Follow the journey ↗</Link></div><button type="button" aria-label="Dismiss departure confirmation" onClick={() => setReceipt(null)}>×</button></div> : null;
}
