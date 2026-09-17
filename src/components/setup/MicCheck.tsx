'use client';

import { motion, useTransform } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useMicLevel } from '@/hooks/useMicLevel';
import { sttSupported } from '@/lib/speech/useSpeechRecognition';

/** A quick "can you hear me?" check before the interview starts. */
export function MicCheck() {
  const [testing, setTesting] = useState(false);
  const { level, denied } = useMicLevel(testing);
  const width = useTransform(level, value => `${Math.min(100, value * 140)}%`);
  const supported = sttSupported();

  return (
    <div className="well rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-fg">Microphone check</p>
          <p className="mt-0.5 text-xs text-muted">
            {denied
              ? 'Microphone blocked. You can still type your answers.'
              : supported
                ? 'Say “testing, one two” and watch the bar move.'
                : 'This browser cannot transcribe speech, so answers are typed. Chrome or Edge support voice.'}
          </p>
        </div>
        <Button variant={testing ? 'danger' : 'glass'} size="sm" onClick={() => setTesting(value => !value)}>
          {testing ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          {testing ? 'Stop' : 'Test'}
        </Button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
        <motion.div
          style={{ width }}
          className="h-full rounded-full bg-gradient-to-r from-mint to-iris"
          transition={{ duration: 0.08 }}
        />
      </div>
    </div>
  );
}
