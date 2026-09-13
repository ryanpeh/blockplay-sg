import { useCallback, useEffect, useRef, useState } from 'react';
import { claimReward, claimElimination, createProfile, equip, purchase, restoreProfile, STORAGE_KEY, unequipAttachment, type ArmoryProfile, type ExerciseReward } from './armory-state';
import type { VehicleKind } from './vehicle-rules';
import type { AttachmentSlot } from './armory-catalog';

export function useArmory() {
  const [profile, setProfile] = useState<ArmoryProfile>(() => { try { return restoreProfile(localStorage.getItem(STORAGE_KEY)); } catch { return createProfile(); } });
  const current = useRef(profile); current.current = profile;
  const [message, setMessage] = useState(''), [saveError, setSaveError] = useState(false);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); setSaveError(false); } catch { setSaveError(true); } }, [profile]);
  const update = useCallback((next: ArmoryProfile) => { current.current = next; setProfile(next); }, []);
  const buy = useCallback((id: string) => { const result = purchase(current.current, id); update(result.profile); setMessage(result.message); }, [update]);
  const equipItem = useCallback((id: string, family: number, vehicle: VehicleKind = 'car') => { const next = equip(current.current, id, family, vehicle); const changed = next !== current.current; update(next); setMessage(changed ? 'Equipped for your next exercise.' : 'Item must be owned before equipping.'); }, [update]);
  const remove = useCallback((family: number, slot: AttachmentSlot) => { update(unequipAttachment(current.current, family, slot)); setMessage('Attachment removed.'); }, [update]);
  const award = useCallback((reward: ExerciseReward) => update(claimReward(current.current, reward)), [update]);
  const awardElimination = useCallback((id: string) => update(claimElimination(current.current, id)), [update]);
  const demoTopUp = useCallback(() => { update({ ...current.current, tokens: Math.min(1000000, current.current.tokens + 250) }); setMessage('250 demo tokens added. No payment was made.'); }, [update]);
  return { profile, buy, equipItem, remove, award, awardElimination, demoTopUp, message, saveError };
}
export type ArmoryStore = ReturnType<typeof useArmory>;
