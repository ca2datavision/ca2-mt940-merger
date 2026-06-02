/**
 * Beneficiary Consolidation Utilities
 *
 * Transforms transaction data to consolidate multiple transactions under
 * a single beneficiary name when details match a configurable keyword.
 * Primary use case: Romanian "PLATA ZILIER" (daily worker payments).
 */

export interface Subfield {
  code: string;
  value: string;
}

export interface ConsolidationOptions {
  enabled: boolean;
  keyword: string;
}

export const DEFAULT_CONSOLIDATION_OPTIONS: ConsolidationOptions = {
  enabled: true,
  keyword: 'PLATA ZILIER',
};

/**
 * Normalize text for keyword matching.
 * - Unicode NFD decomposition to separate diacritics
 * - Remove combining diacritical marks
 * - Convert to lowercase
 *
 * @example
 * normalizeForMatch("PLATĂ ZILIER") // "plata zilier"
 * normalizeForMatch("POPESCU ȘI IONESCU") // "popescu si ionescu"
 */
export function normalizeForMatch(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Parse +NN subfields from BRD :86: format.
 *
 * @example
 * parseSubfields("+23PLATA ZILIER+32POPESCU ION")
 * // [{code: "+23", value: "PLATA ZILIER"}, {code: "+32", value: "POPESCU ION"}]
 */
export function parseSubfields(description: string): Subfield[] {
  if (!description) return [];

  const subfields: Subfield[] = [];
  const pattern = /\+(\d{2})([^+]*)/g;
  let match;

  while ((match = pattern.exec(description)) !== null) {
    subfields.push({
      code: `+${match[1]}`,
      value: match[2].trim(),
    });
  }

  return subfields;
}

/**
 * Reconstruct :86: content from subfields.
 * Preserves original order and format.
 *
 * @example
 * reconstructSubfields([{code: "+23", value: "INFO"}, {code: "+32", value: "NAME"}])
 * // "+23INFO+32NAME"
 */
export function reconstructSubfields(subfields: Subfield[]): string {
  return subfields.map(sf => `${sf.code}${sf.value}`).join('');
}

/**
 * Check if text contains keyword (case-insensitive, diacritics-agnostic).
 */
export function containsKeyword(text: string, keyword: string): boolean {
  if (!text || !keyword || !keyword.trim()) return false;

  const normalizedText = normalizeForMatch(text);
  const normalizedKeyword = normalizeForMatch(keyword);

  return normalizedText.includes(normalizedKeyword);
}

/**
 * Consolidate CSV row beneficiary/details.
 *
 * If details contain the keyword:
 * - Beneficiary becomes the keyword
 * - Original beneficiary is appended to details
 *
 * @example
 * consolidateCSVRow("POPESCU ION", "PLATA ZILIER LUNA MAI", {enabled: true, keyword: "PLATA ZILIER"})
 * // {beneficiary: "PLATA ZILIER", details: "PLATA ZILIER LUNA MAI, POPESCU ION"}
 */
export function consolidateCSVRow(
  beneficiary: string,
  details: string,
  options: ConsolidationOptions
): { beneficiary: string; details: string } {
  if (!options.enabled || !options.keyword?.trim()) {
    return { beneficiary, details };
  }

  if (!containsKeyword(details, options.keyword)) {
    return { beneficiary, details };
  }

  const trimmedBeneficiary = beneficiary?.trim() || '';
  const trimmedDetails = details?.trim() || '';

  let newDetails = trimmedDetails;
  if (trimmedBeneficiary && trimmedBeneficiary !== options.keyword.trim()) {
    newDetails = trimmedDetails
      ? `${trimmedDetails}, ${trimmedBeneficiary}`
      : trimmedBeneficiary;
  }

  return {
    beneficiary: options.keyword.trim(),
    details: newDetails,
  };
}

/**
 * Consolidate MT940 :86: subfields for BRD format.
 *
 * Triggers when:
 * - Transaction type is NTRF (Non-SWIFT Transfer)
 * - +23 subfield contains the keyword
 *
 * Transformation:
 * - Append +32 and +33 values to +23 (space-separated)
 * - Replace +32 with the keyword
 * - Remove +33
 *
 * @example
 * // Input: "+23PLATA ZILIER LUNA MAI+32POPESCU ION+33BUCURESTI"
 * // Output: "+23PLATA ZILIER LUNA MAI POPESCU ION BUCURESTI+32PLATA ZILIER"
 */
export function consolidate86Subfields(
  description: string,
  transactionType: string,
  options: ConsolidationOptions
): string {
  if (!options.enabled || !options.keyword?.trim()) {
    return description;
  }

  if (!description) {
    return description;
  }

  const normalizedType = transactionType?.toUpperCase() || '';
  if (normalizedType !== 'NTRF') {
    return description;
  }

  const subfields = parseSubfields(description);
  if (subfields.length === 0) {
    return description;
  }

  const field23 = subfields.find(sf => sf.code === '+23');
  if (!field23 || !containsKeyword(field23.value, options.keyword)) {
    return description;
  }

  const field32 = subfields.find(sf => sf.code === '+32');
  const field33 = subfields.find(sf => sf.code === '+33');

  const isField32Keyword = field32?.value && normalizeForMatch(field32.value) === normalizeForMatch(options.keyword);

  // Idempotency: if +32=keyword and +33 doesn't exist or is empty, return unchanged
  if (isField32Keyword && (!field33 || !field33.value)) {
    return description;
  }

  // Build beneficiary parts to append to +23
  const beneficiaryParts: string[] = [];
  // Only include +32 if it's NOT already the keyword
  if (field32?.value && !isField32Keyword) beneficiaryParts.push(field32.value);
  if (field33?.value) beneficiaryParts.push(field33.value);

  if (beneficiaryParts.length === 0) {
    return description;
  }

  const newSubfields = subfields.map(sf => {
    if (sf.code === '+23') {
      const appendedValue = beneficiaryParts.join(' ');
      return {
        code: sf.code,
        value: sf.value ? `${sf.value} ${appendedValue}` : appendedValue,
      };
    }
    if (sf.code === '+32') {
      return {
        code: sf.code,
        value: options.keyword.trim(),
      };
    }
    return sf;
  }).filter(sf => sf.code !== '+33');

  return reconstructSubfields(newSubfields);
}

/**
 * Get prefix content before first +NN subfield.
 * BRD format often has a 3-digit transaction code prefix.
 */
export function getDescriptionPrefix(description: string): string {
  if (!description) return '';

  const firstPlusIndex = description.indexOf('+');
  if (firstPlusIndex === -1) return description;
  if (firstPlusIndex === 0) return '';

  return description.slice(0, firstPlusIndex);
}

/**
 * Parse description preserving prefix.
 */
export function parseDescriptionWithPrefix(description: string): {
  prefix: string;
  subfields: Subfield[];
} {
  const prefix = getDescriptionPrefix(description);
  const subfieldPart = prefix ? description.slice(prefix.length) : description;
  const subfields = parseSubfields(subfieldPart);

  return { prefix, subfields };
}

/**
 * Reconstruct description with prefix.
 */
export function reconstructDescriptionWithPrefix(
  prefix: string,
  subfields: Subfield[]
): string {
  return prefix + reconstructSubfields(subfields);
}

/**
 * Full consolidation for :86: description with prefix preservation.
 */
export function consolidate86Description(
  description: string,
  transactionType: string,
  options: ConsolidationOptions
): string {
  if (!options.enabled || !options.keyword?.trim()) {
    return description;
  }

  if (!description) {
    return description;
  }

  const normalizedType = transactionType?.toUpperCase() || '';
  if (normalizedType !== 'NTRF') {
    return description;
  }

  const { prefix, subfields } = parseDescriptionWithPrefix(description);

  if (subfields.length === 0) {
    return description;
  }

  const field23 = subfields.find(sf => sf.code === '+23');
  if (!field23 || !containsKeyword(field23.value, options.keyword)) {
    return description;
  }

  const field32 = subfields.find(sf => sf.code === '+32');
  const field33 = subfields.find(sf => sf.code === '+33');

  const isField32Keyword = field32?.value && normalizeForMatch(field32.value) === normalizeForMatch(options.keyword);

  // Idempotency: if +32=keyword and +33 doesn't exist or is empty, return unchanged
  if (isField32Keyword && (!field33 || !field33.value)) {
    return description;
  }

  // Build beneficiary parts to append to +23
  const beneficiaryParts: string[] = [];
  // Only include +32 if it's NOT already the keyword
  if (field32?.value && !isField32Keyword) beneficiaryParts.push(field32.value);
  if (field33?.value) beneficiaryParts.push(field33.value);

  if (beneficiaryParts.length === 0) {
    return description;
  }

  const newSubfields = subfields.map(sf => {
    if (sf.code === '+23') {
      const appendedValue = beneficiaryParts.join(' ');
      return {
        code: sf.code,
        value: sf.value ? `${sf.value} ${appendedValue}` : appendedValue,
      };
    }
    if (sf.code === '+32') {
      return {
        code: sf.code,
        value: options.keyword.trim(),
      };
    }
    return sf;
  }).filter(sf => sf.code !== '+33');

  return reconstructDescriptionWithPrefix(prefix, newSubfields);
}
