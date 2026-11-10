const metrics = ['pages', 'referrers', 'countries', 'browsers', 'devices', 'interactions', 'sections', 'pageTime', 'sectionTime', 'scrollDepth'];
const isCount = value => Number.isSafeInteger(value) && value >= 0;
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function validateUsage(data, days) {
  if (!data || data.days !== days || !isCount(data.pageViews) || !isCount(data.interactions)
    || !isCount(data.activeTimeMs) || !isCount(data.timingPageViews) || data.timingPageViews > data.pageViews
    || (data.timingPageViews ? !isCount(data.averageActiveTimeMs) : data.averageActiveTimeMs !== null)
    || !validDate(data.updatedAt) || !Array.isArray(data.daily) || data.daily.length !== days
    || !data.breakdowns || !metrics.every(metric => Array.isArray(data.breakdowns[metric])
      && data.breakdowns[metric].every(item => item && typeof item.name === 'string' && isCount(item.value)))
    || !data.daily.every(item => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && validDate(item.date) && isCount(item.value))
    || data.daily.reduce((sum, item) => sum + item.value, 0) !== data.pageViews
    || data.breakdowns.pageTime.reduce((sum, item) => sum + item.value, 0) !== data.activeTimeMs
    || data.breakdowns.sectionTime.reduce((sum, item) => sum + item.value, 0) > data.activeTimeMs
    || (data.timingPageViews && data.averageActiveTimeMs !== Math.round(data.activeTimeMs / data.timingPageViews))) throw new Error('Invalid usage response');
  return data;
}

export function validateTraffic(data) {
  const count = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (!data || !count(data.requests) || !count(data.visits) || !validDate(data.updatedAt)
    || !['paths', 'countries'].every(key => Array.isArray(data[key]) && data[key].every(item =>
      item && typeof item.name === 'string' && count(item.value)))) throw new Error('Invalid traffic response');
  return data;
}

export function formatDuration(milliseconds) {
  const seconds = Math.round(milliseconds / 1000);
  if (milliseconds > 0 && seconds === 0) return '<1s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
