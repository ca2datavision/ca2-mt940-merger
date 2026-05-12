import { describe, it, expect } from 'vitest';
import {
  detectProfile,
  decode86,
  decode86WithProfile,
  brdProfile,
  genericProfile,
  getRegisteredProfiles,
  registerProfile,
  type BankProfile,
} from './index.js';

describe('BRD Profile', () => {
  const sampleBRD86 = '000+20Pl Inst Paymnt+30BRDEROBU+31RO34RNCB0847173501260001+32RADU DIANA GEORGIANA+33/+23PLATA ZILIER';

  it('decodes BRD-style +NN subfields', () => {
    const result = brdProfile.decodeSubfields(sampleBRD86);

    expect(result.profileName).toBe('BRD');
    expect(result.subfields.length).toBeGreaterThan(0);

    const ref20 = result.subfields.find(s => s.code === '+20');
    expect(ref20).toBeDefined();
    expect(ref20?.value).toBe('Pl Inst Paymnt');
    expect(ref20?.name).toBe('Transaction Reference');
  });

  it('decodes +30 as Beneficiary Bank BIC', () => {
    const result = brdProfile.decodeSubfields(sampleBRD86);
    const bic = result.subfields.find(s => s.code === '+30');

    expect(bic).toBeDefined();
    expect(bic?.value).toBe('BRDEROBU');
    expect(bic?.name).toBe('Beneficiary Bank BIC');
  });

  it('decodes +31 as Beneficiary Account', () => {
    const result = brdProfile.decodeSubfields(sampleBRD86);
    const account = result.subfields.find(s => s.code === '+31');

    expect(account).toBeDefined();
    expect(account?.value).toBe('RO34RNCB0847173501260001');
    expect(account?.name).toBe('Beneficiary Account (IBAN)');
  });

  it('decodes +32 as Beneficiary Name', () => {
    const result = brdProfile.decodeSubfields(sampleBRD86);
    const name = result.subfields.find(s => s.code === '+32');

    expect(name).toBeDefined();
    expect(name?.value).toBe('RADU DIANA GEORGIANA');
    expect(name?.name).toBe('Beneficiary Name Line 1');
  });

  it('decodes +23 as Additional Info', () => {
    const result = brdProfile.decodeSubfields(sampleBRD86);
    const info = result.subfields.find(s => s.code === '+23');

    expect(info).toBeDefined();
    expect(info?.value).toBe('PLATA ZILIER');
  });

  it('handles empty +33 field', () => {
    const result = brdProfile.decodeSubfields(sampleBRD86);
    const name2 = result.subfields.find(s => s.code === '+33');

    expect(name2).toBeDefined();
    expect(name2?.value).toBe('/');
  });

  it('detects 000 transaction code prefix', () => {
    const result = brdProfile.decodeSubfields(sampleBRD86);
    const txCode = result.subfields.find(s => s.code === 'TXC');

    expect(txCode).toBeDefined();
    expect(txCode?.value).toContain('000');
    expect(txCode?.value).toContain('Standard Transfer');
  });

  it('matches BRD account pattern', () => {
    expect(brdProfile.accountPattern?.test('RO49BRDE410SV12345678901')).toBe(true);
    expect(brdProfile.accountPattern?.test('RO49RNCB410SV12345678901')).toBe(false);
  });

  it('matches BRD content pattern', () => {
    expect(brdProfile.detectPattern.test(sampleBRD86)).toBe(true);
    expect(brdProfile.detectPattern.test('Simple text without subfields')).toBe(false);
  });
});

describe('Generic Profile', () => {
  it('decodes +NN subfields', () => {
    const content = '+20REF001+32JOHN DOE+23Payment';
    const result = genericProfile.decodeSubfields(content);

    expect(result.profileName).toBe('Generic');
    expect(result.subfields).toHaveLength(3);

    const ref = result.subfields.find(s => s.code === '+20');
    expect(ref?.value).toBe('REF001');
  });

  it('decodes ?NN subfields (German format)', () => {
    const content = '?20REF001?32BENEFICIARY?23INFO';
    const result = genericProfile.decodeSubfields(content);

    expect(result.subfields).toHaveLength(3);
    expect(result.subfields[0].code).toBe('?20');
    expect(result.subfields[0].value).toBe('REF001');
  });

  it('decodes /XXX/ subfields (ISO format)', () => {
    const content = '/EREF/END2END123/KREF/CUST456/BENM/John Doe';
    const result = genericProfile.decodeSubfields(content);

    expect(result.subfields.length).toBeGreaterThanOrEqual(2);

    const eref = result.subfields.find(s => s.code === '/EREF/');
    expect(eref).toBeDefined();
    expect(eref?.value).toBe('END2END123');
    expect(eref?.name).toBe('End-to-End Reference');
  });

  it('handles unstructured text', () => {
    const content = 'Simple payment description without any subfields';
    const result = genericProfile.decodeSubfields(content);

    expect(result.subfields).toHaveLength(0);
    expect(result.unstructuredText).toBe(content);
  });

  it('extracts prefix before subfields', () => {
    const content = 'PREFIX TEXT+20REF001+32NAME';
    const result = genericProfile.decodeSubfields(content);

    expect(result.subfields.length).toBeGreaterThan(0);
  });
});

describe('Profile Detection', () => {
  it('detects BRD by account pattern', () => {
    const match = detectProfile('RO49BRDE410SV12345678901');

    expect(match.profile.name).toContain('BRD');
    expect(match.matchedBy).toBe('account');
    expect(match.confidence).toBe('high');
  });

  it('detects BRD by content pattern', () => {
    const content = '000+20Ref+30BIC+31IBAN';
    const match = detectProfile(undefined, content);

    expect(match.profile.name).toContain('BRD');
    expect(match.matchedBy).toBe('content');
    expect(match.confidence).toBe('medium');
  });

  it('falls back to generic for unknown', () => {
    const match = detectProfile('DE89370400440532013000', 'Unstructured text');

    expect(match.profile.name).toBe('Generic');
    expect(match.matchedBy).toBe('fallback');
    expect(match.confidence).toBe('low');
  });

  it('prefers account match over content', () => {
    const content = '000+20Ref+30BIC+31IBAN';
    const match = detectProfile('RO49BRDE410SV12345678901', content);

    expect(match.matchedBy).toBe('account');
  });
});

describe('decode86 function', () => {
  it('auto-detects and decodes', () => {
    const content = '000+20PayRef+32Beneficiary';
    const result = decode86(content, 'RO49BRDE123456789');

    expect(result.profileName).toBe('BRD');
    expect(result.subfields.length).toBeGreaterThan(0);
  });

  it('uses generic for unknown accounts with unstructured content', () => {
    const content = 'Simple payment description';
    const result = decode86(content, 'DE89370400440532013000');

    expect(result.profileName).toBe('Generic');
  });

  it('uses content detection when account is unknown', () => {
    const content = '000+20PayRef+30BIC+31IBAN';
    const result = decode86(content, 'DE89370400440532013000');

    expect(result.profileName).toBe('BRD');
  });
});

describe('decode86WithProfile function', () => {
  it('uses specified profile by name', () => {
    const content = '000+20REF+32NAME';
    const result = decode86WithProfile(content, 'BRD');

    expect(result.profileName).toBe('BRD');
  });

  it('falls back to generic for unknown profile', () => {
    const content = '+20REF+32NAME';
    const result = decode86WithProfile(content, 'UnknownBank');

    expect(result.profileName).toBe('Generic');
  });

  it('is case-insensitive for profile name', () => {
    const content = '000+20REF';
    const result = decode86WithProfile(content, 'brd');

    expect(result.profileName).toBe('BRD');
  });
});

describe('Profile Registry', () => {
  it('lists registered profiles', () => {
    const profiles = getRegisteredProfiles();

    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.some(p => p.name.includes('BRD'))).toBe(true);
  });

  it('allows registering new profiles', () => {
    const customProfile: BankProfile = {
      name: 'TestBank',
      detectPattern: /TESTBANK/,
      accountPattern: /^TEST/,
      decodeSubfields: (content) => ({
        profileName: 'TestBank',
        subfields: [{ code: 'T1', name: 'Test', value: content, raw: content }],
        raw: content,
      }),
    };

    const initialCount = getRegisteredProfiles().length;
    registerProfile(customProfile);
    const newCount = getRegisteredProfiles().length;

    expect(newCount).toBe(initialCount + 1);

    const match = detectProfile('TESTACCOUNT123');
    expect(match.profile.name).toBe('TestBank');
  });
});

describe('Real-world BRD samples', () => {
  it('decodes salary payment', () => {
    const content = '010+20SALARY JAN 2024+32ACME CORPORATION SRL+33BUCURESTI+23Salariu luna ianuarie';
    const result = brdProfile.decodeSubfields(content);

    expect(result.subfields.find(s => s.code === 'TXC')?.value).toContain('Salary');
    expect(result.subfields.find(s => s.code === '+20')?.value).toBe('SALARY JAN 2024');
    expect(result.subfields.find(s => s.code === '+32')?.value).toBe('ACME CORPORATION SRL');
  });

  it('decodes fee/commission', () => {
    const content = '050+20COMISION LUNAR+23Taxa administrare cont';
    const result = brdProfile.decodeSubfields(content);

    expect(result.subfields.find(s => s.code === 'TXC')?.value).toContain('Fee');
  });

  it('handles multi-line beneficiary', () => {
    const content = '000+20REF123+32JOHN DOE VERY LONG NAME+33THAT CONTINUES HERE+34STREET ADDRESS 123+35CITY COUNTRY';
    const result = brdProfile.decodeSubfields(content);

    expect(result.subfields.find(s => s.code === '+32')).toBeDefined();
    expect(result.subfields.find(s => s.code === '+33')).toBeDefined();
    expect(result.subfields.find(s => s.code === '+34')).toBeDefined();
    expect(result.subfields.find(s => s.code === '+35')).toBeDefined();
  });
});
