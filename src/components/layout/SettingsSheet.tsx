'use client';

import { useEffect, useState } from 'react';
import { LogOut, Volume2 } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented, Switch } from '@/components/ui/Controls';
import { SelectField, TextField } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { useEngine } from '@/lib/engine-status';
import { clearHistory } from '@/lib/history';
import { useSettings } from '@/lib/settings';
import { RECOGNITION_LANGUAGES, TIMER_OPTIONS } from '@/lib/constants';
import { loadVoices, speak, stopSpeaking } from '@/lib/speech/tts';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update } = useSettings();
  const { user, signOut, updateProfile } = useAuth();
  const { state, status, mode } = useEngine();
  const { notify } = useToast();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [profile, setProfile] = useState({ name: '', targetRole: '' });

  useEffect(() => {
    if (!open) return;
    void loadVoices().then(setVoices);
  }, [open]);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name, targetRole: user.targetRole ?? '' });
    }
  }, [user]);

  const englishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith('en'));

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Ora&rsquo;s voice</h3>
          <Switch
            checked={settings.voiceEnabled}
            onChange={value => {
              update({ voiceEnabled: value });
              if (!value) stopSpeaking();
            }}
            label="Read questions aloud"
            description="Interviews feel closer to the real thing when you listen instead of read."
          />
          <SelectField
            label="Voice"
            value={settings.voiceURI ?? ''}
            onChange={event => update({ voiceURI: event.target.value || null })}
            disabled={englishVoices.length === 0}
          >
            <option value="">Automatic</option>
            {englishVoices.map(voice => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </SelectField>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="speech-rate" className="text-sm font-medium text-fg">
                Speaking pace
              </label>
              <span className="font-mono text-xs text-muted">{settings.speechRate.toFixed(2)}×</span>
            </div>
            <input
              id="speech-rate"
              type="range"
              min={0.7}
              max={1.4}
              step={0.05}
              value={settings.speechRate}
              onChange={event => update({ speechRate: Number(event.target.value) })}
              className="w-full accent-[var(--color-mint)]"
            />
          </div>
          <Button
            variant="glass"
            size="sm"
            onClick={() =>
              speak('Hello, I am Ora. Tell me about a project you are proud of.', {
                voiceURI: settings.voiceURI,
                rate: settings.speechRate,
              })
            }
          >
            <Volume2 className="size-4" /> Test voice
          </Button>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Microphone</h3>
          <Switch
            checked={settings.autoListen}
            onChange={value => update({ autoListen: value })}
            label="Open the mic automatically"
            description="Starts recording as soon as Ora finishes asking."
          />
          <SelectField
            label="Recognition language"
            value={settings.recognitionLang}
            onChange={event => update({ recognitionLang: event.target.value })}
          >
            {RECOGNITION_LANGUAGES.map(language => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </SelectField>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Interview defaults</h3>
          <div>
            <p className="mb-2 text-sm font-medium text-fg">Answer timer</p>
            <Segmented
              size="sm"
              ariaLabel="Default answer timer"
              options={TIMER_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
              value={settings.timerSeconds}
              onChange={value => update({ timerSeconds: value })}
            />
          </div>
          {!user && (
            <TextField
              label="Weekly goal"
              type="number"
              min={1}
              max={21}
              value={settings.weeklyGoal}
              onChange={event => update({ weeklyGoal: Number(event.target.value) || 1 })}
              hint="interviews per week"
            />
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Account</h3>
          {user ? (
            <>
              <TextField
                label="Name"
                value={profile.name}
                onChange={event => setProfile(current => ({ ...current, name: event.target.value }))}
              />
              <TextField
                label="Target role"
                placeholder="SDE Intern"
                value={profile.targetRole}
                onChange={event => setProfile(current => ({ ...current, targetRole: event.target.value }))}
              />
              <TextField
                label="Weekly goal"
                type="number"
                min={1}
                max={21}
                value={user.weeklyGoal}
                onChange={event => void updateProfile({ weeklyGoal: Number(event.target.value) || 1 })}
                hint="interviews per week"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await updateProfile({ name: profile.name, targetRole: profile.targetRole || null });
                      notify({ title: 'Profile saved', tone: 'success' });
                    } catch {
                      notify({ title: 'Could not save your profile', tone: 'error' });
                    }
                  }}
                >
                  Save profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    signOut();
                    notify({ title: 'Signed out' });
                    onClose();
                  }}
                >
                  <LogOut className="size-4" /> Sign out
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Sign in to keep your scorecards, track readiness over time and practise across devices.
              </p>
              <ButtonLink href="/login" variant="primary" size="sm" onClick={onClose}>
                Sign in or create an account
              </ButtonLink>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">This device</h3>
          <p className="text-sm text-muted">
            {state === 'api'
              ? mode === 'llm'
                ? `Connected to the interview API. Answers are scored by ${status?.model}.`
                : 'Connected to the interview API, which has no AI key configured. The rule-based coach is scoring answers.'
              : 'The interview API is unreachable, so interviews run entirely in this browser.'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearHistory();
              notify({ title: 'Local history cleared', description: 'Interviews saved to your account are unaffected.' });
            }}
          >
            Clear local history
          </Button>
        </section>
      </div>
    </Sheet>
  );
}
