const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

const QUERY = `
  query PortfolioAnalytics($zoneTag: string, $datetime_geq: Time, $datetime_leq: Time) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        totals: httpRequests1hGroups(
          limit: 100
          filter: { datetime_geq: $datetime_geq, datetime_leq: $datetime_leq }
          orderBy: [datetime_ASC]
        ) {
          sum { requests visits }
        }
        paths: httpRequests1hGroups(
          limit: 10
          groupBy: [clientRequestPath]
          filter: { datetime_geq: $datetime_geq, datetime_leq: $datetime_leq }
          orderBy: [sum_requests_DESC]
        ) {
          dimensions { clientRequestPath }
          sum { requests }
        }
        countries: httpRequests1hGroups(
          limit: 10
          groupBy: [clientCountryName]
          filter: { datetime_geq: $datetime_geq, datetime_leq: $datetime_leq }
          orderBy: [sum_requests_DESC]
        ) {
          dimensions { clientCountryName }
          sum { requests }
        }
      }
    }
  }
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=300"
    }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS"
        }
      });
    }
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ZONE_TAG) {
      return json({ error: "Analytics endpoint is not configured" }, 503);
    }

    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          zoneTag: env.CLOUDFLARE_ZONE_TAG,
          datetime_geq: start.toISOString(),
          datetime_leq: end.toISOString()
        }
      })
    });
    if (!response.ok) return json({ error: "Cloudflare analytics request failed" }, 502);

    const payload = await response.json();
    if (payload.errors?.length) return json({ error: "Cloudflare analytics query failed" }, 502);
    const analytics = payload.data?.viewer?.zones?.[0];
    const totals = analytics?.totals?.reduce((result, group) => ({
      requests: result.requests + (group.sum?.requests || 0),
      visits: result.visits + (group.sum?.visits || 0)
    }), { requests: 0, visits: 0 }) || { requests: 0, visits: 0 };
    const paths = (analytics?.paths || [])
      .flatMap((group) => group.dimensions?.clientRequestPath ? [{ name: group.dimensions.clientRequestPath, value: group.sum?.requests || 0 }] : [])
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const countries = (analytics?.countries || [])
      .flatMap((group) => group.dimensions?.clientCountryName ? [{ name: group.dimensions.clientCountryName, value: group.sum?.requests || 0 }] : [])
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return json({ requests: totals.requests || 0, visits: totals.visits || 0, paths, countries, updatedAt: end.toISOString() });
  }
};
