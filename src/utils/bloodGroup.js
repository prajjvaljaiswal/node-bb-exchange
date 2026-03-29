// 36 ABO/Rh blood group subtypes used in India
const BLOOD_GROUPS = [
  'A+', 'A-', 'A1+', 'A1-', 'A2+', 'A2-',
  'B+', 'B-',
  'AB+', 'AB-', 'A1B+', 'A1B-', 'A2B+', 'A2B-',
  'O+', 'O-',
  'Bombay_Oh+', 'Bombay_Oh-',
  'Cis_AB+', 'Cis_AB-',
  'A3+', 'A3-',
  'Ax+', 'Ax-',
  'B3+', 'B3-',
  'Am+', 'Am-',
  'Bm+', 'Bm-',
  'Aend+', 'Aend-',
  'OhA+', 'OhA-',
  'OhB+', 'OhB-',
];

// Compatibility matrix: key can receive from which groups
// Simplified ABO/Rh compatibility (major groups)
const COMPATIBILITY_MAP = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

function getCompatibleDonorGroups(recipientGroup) {
  // For subtypes, strip to base ABO/Rh for compatibility check
  const base = normalizeToBase(recipientGroup);
  return COMPATIBILITY_MAP[base] || [recipientGroup];
}

function isCompatible(donorGroup, recipientGroup) {
  const compatible = getCompatibleDonorGroups(recipientGroup);
  const donorBase = normalizeToBase(donorGroup);
  return compatible.some(g => normalizeToBase(g) === donorBase);
}

function normalizeToBase(group) {
  if (group.includes('AB')) return group.endsWith('-') ? 'AB-' : 'AB+';
  if (group.startsWith('A')) return group.endsWith('-') ? 'A-' : 'A+';
  if (group.startsWith('B')) return group.endsWith('-') ? 'B-' : 'B+';
  if (group.startsWith('O')) return group.endsWith('-') ? 'O-' : 'O+';
  return group;
}

function isValidBloodGroup(group) {
  return BLOOD_GROUPS.includes(group);
}

module.exports = { BLOOD_GROUPS, COMPATIBILITY_MAP, getCompatibleDonorGroups, isCompatible, isValidBloodGroup };
