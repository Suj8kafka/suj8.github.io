const metrics = ['pages', 'referrers', 'countries', 'browsers', 'devices', 'interactions', 'sections', 'pageTime', 'sectionTime', 'scrollDepth'];
const isCount = value => Number.isSafeInteger(value) && value >= 0;
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function validateUsage(data, days) {
  const allTime = days === 'all';
  const series = allTime ? data?.monthly : data?.daily;
  if (![1, 7, 30, 'all'].includes(days) || !data || data.days !== days || !isCount(data.pageViews) || !isCount(data.interactions)
    || !isCount(data.activeTimeMs) || !isCount(data.timingPageViews) || data.timingPageViews > data.pageViews
    || (data.timingPageViews ? !isCount(data.averageActiveTimeMs) : data.averageActiveTimeMs !== null)
    || !validDate(data.updatedAt) || !Array.isArray(series) || (allTime ? !series.length : series.length !== days)
    || !data.breakdowns || !metrics.every(metric => Array.isArray(data.breakdowns[metric])
      && data.breakdowns[metric].every(item => item && typeof item.name === 'string' && isCount(item.value)))
    || !series.every(item => item && (allTime ? /^\d{4}-(0[1-9]|1[0-2])$/ : /^\d{4}-\d{2}-\d{2}$/).test(item.date)
      && validDate(allTime ? `${item.date}-01` : item.date) && isCount(item.value))
    || (allTime && series.some((item, i) => {
      const next = new Date(`${item.date}-01T00:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      return i < series.length - 1 && series[i + 1].date !== next.toISOString().slice(0, 7);
    }))
    || series.reduce((sum, item) => sum + item.value, 0) !== data.pageViews
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
