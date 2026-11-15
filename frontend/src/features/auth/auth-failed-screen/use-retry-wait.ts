import { useEffect, useState } from 'react';
import { MS_PER_SECOND } from '@constants/cost';

/** True until `waitSeconds` have passed; no wait given means no waiting. */
export function useRetryWait(waitSeconds: number | undefined): boolean {
  const [waiting, setWaiting] = useState(waitSeconds !== undefined);

  useEffect(() => {
    if (waitSeconds === undefined) return;
    const timer = setTimeout(() => {
      setWaiting(false);
    }, waitSeconds * MS_PER_SECOND);
    return () => {
      clearTimeout(timer);
    };
  }, [waitSeconds]);

  return waiting;
}
