export const WORK_TYPES = [
  ['freelance', 'Freelance work'],
  ['projects', 'Project work'],
  ['fullTime', 'Full-time roles'],
  ['contract', 'Contract work']
];
export const DEFAULT_AVAILABILITY = {
  status: 'open', label: '', note: '',
  workTypes: { freelance: true, projects: true, fullTime: true, contract: true }
};
const LABELS = { open: 'Open to work', limited: 'Limited availability', closed: 'Not taking work' };

export function validateAvailability(value) {
  if (!value || !Object.hasOwn(LABELS, value.status)) throw new Error('Choose an availability status.');
  if (typeof value.label !== 'string' || value.label.trim().length > 24) throw new Error('Keep the badge text within 24 characters.');
  if (typeof value.note !== 'string' || value.note.trim().length > 160) throw new Error('Keep the note within 160 characters.');
  if (!value.workTypes || WORK_TYPES.some(([key]) => typeof value.workTypes[key] !== 'boolean')) {
    throw new Error('Choose the types of work you accept.');
  }
  if (value.status !== 'closed' && !WORK_TYPES.some(([key]) => value.workTypes[key])) {
    throw new Error('Select at least one work type, or choose Not taking work.');
  }
  return {
    status: value.status, label: value.label.trim(), note: value.note.trim(),
    workTypes: Object.fromEntries(WORK_TYPES.map(([key]) => [key, value.workTypes[key]]))
  };
}

export function availabilityView(value = DEFAULT_AVAILABILITY) {
  const settings = validateAvailability(value);
  const types = WORK_TYPES.filter(([key]) => settings.workTypes[key]).map(([, label]) => label);
  const details = settings.status === 'closed' ? 'Not currently taking new work.'
    : `${settings.status === 'limited' ? 'Limited availability for' : 'Open to'} ${types.join(', ').toLowerCase()}.`;
  return { label: settings.label || LABELS[settings.status], details, note: settings.note, status: settings.status };
}

export function applyAvailability(document, settings) {
  const view = availabilityView(settings);
  const description = [view.details, view.note].filter(Boolean).join(' ');
  document.querySelectorAll('[data-availability-label]').forEach(element => { element.textContent = view.label; });
  document.querySelectorAll('[data-availability-details]').forEach(element => { element.textContent = description; });
  document.querySelectorAll('.availability-badge').forEach(element => {
    element.title = description;
    element.dataset.availabilityStatus = view.status;
  });
}
