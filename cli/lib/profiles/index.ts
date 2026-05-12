/**
 * Bank Profile Registry
 * Auto-detects and applies bank-specific :86: decoders.
 */

import type { BankProfile, ProfileMatch, DecodeResult } from './types.js';
import { brdProfile } from './brd.js';
import { genericProfile } from './generic.js';

export type { BankProfile, ProfileMatch, DecodeResult, SubfieldResult } from './types.js';

const registeredProfiles: BankProfile[] = [
  brdProfile,
];

export function registerProfile(profile: BankProfile): void {
  const existingIndex = registeredProfiles.findIndex(p => p.name === profile.name);
  if (existingIndex >= 0) {
    registeredProfiles[existingIndex] = profile;
  } else {
    registeredProfiles.push(profile);
  }
}

export function getRegisteredProfiles(): BankProfile[] {
  return [...registeredProfiles];
}

export function detectProfile(accountId?: string, content86?: string): ProfileMatch {
  if (accountId) {
    for (const profile of registeredProfiles) {
      if (profile.accountPattern && profile.accountPattern.test(accountId)) {
        return {
          profile,
          matchedBy: 'account',
          confidence: 'high',
        };
      }
    }
  }

  if (content86) {
    for (const profile of registeredProfiles) {
      if (profile.detectPattern.test(content86)) {
        return {
          profile,
          matchedBy: 'content',
          confidence: 'medium',
        };
      }
    }
  }

  return {
    profile: genericProfile,
    matchedBy: 'fallback',
    confidence: 'low',
  };
}

export function decode86(content: string, accountId?: string): DecodeResult {
  const { profile } = detectProfile(accountId, content);
  return profile.decodeSubfields(content);
}

export function decode86WithProfile(content: string, profileName: string): DecodeResult {
  const normalizedName = profileName.toLowerCase();
  const profile = registeredProfiles.find(p =>
    p.name.toLowerCase().startsWith(normalizedName) ||
    p.name.toLowerCase().includes(normalizedName)
  );

  if (profile) {
    return profile.decodeSubfields(content);
  }

  return genericProfile.decodeSubfields(content);
}

export { brdProfile } from './brd.js';
export { genericProfile } from './generic.js';
