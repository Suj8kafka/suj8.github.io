export const WORK_TYPES = [
  ['freelance', 'Freelance work', 'freelance'],
  ['projects', 'Project work', 'project'],
  ['fullTime', 'Full-time roles', 'full-time'],
  ['contract', 'Contract work', 'contract']
];
export const DEFAULT_AVAILABILITY = {
  status: 'open', label: '', note: '',
  workTypes: { freelance: true, projects: true, fullTime: true, contract: true }
};
const LABELS = { open: 'Open to work', limited: 'Limited availability', closed: 'Not taking work' };
const joinTypes = values => values.length > 1 ? `${values.slice(0, -1).join(', ')} and ${values.at(-1)}` : values[0];

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
  const selectedTypes = WORK_TYPES.filter(([key]) => settings.workTypes[key]);
  const workList = joinTypes(selectedTypes.map(([, label]) => label));
  const shortList = joinTypes(selectedTypes.map(([, , label]) => label));
  const prefix = settings.status === 'limited' ? 'Limited availability for' : 'Open to';
  const details = settings.status === 'closed' ? 'Not currently taking new work.'
    : `${prefix} ${workList.toLowerCase()}.`;
  const engagement = settings.status === 'closed' ? details : `${prefix} ${shortList} work.`;
  return { label: settings.label || LABELS[settings.status], details, engagement, note: settings.note, status: settings.status };
}

export function applyAvailability(document, settings) {
  const view = availabilityView(settings);
  const description = [view.details, view.note].filter(Boolean).join(' ');
  document.querySelectorAll('[data-availability-label]').forEach(element => { element.textContent = view.label; });
  document.querySelectorAll('[data-availability-details]').forEach(element => { element.textContent = description; });
  document.querySelectorAll('[data-availability-engagement]').forEach(element => {
    element.textContent = view.engagement;
    element.dataset.availabilityStatus = view.status;
  });
  document.querySelectorAll('.availability-badge').forEach(element => {
    element.title = description;
    element.dataset.availabilityStatus = view.status;
  });
}
