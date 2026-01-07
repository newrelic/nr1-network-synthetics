import { NerdGraphQuery } from 'nr1';
import { FILTER_EXCLUSION_LIST } from './constants';

export const timeRangeToNrql = (timeRange) => {
  const MINUTE = 60000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  if (!timeRange) {
    return 'SINCE 30 minutes ago';
  }

  if (timeRange.beginTime && timeRange.endTime) {
    return `SINCE ${timeRange.beginTime} UNTIL ${timeRange.endTime}`;
  } else if (timeRange.begin_time && timeRange.end_time) {
    return `SINCE ${timeRange.begin_time} UNTIL ${timeRange.end_time}`;
  } else if (timeRange.duration <= HOUR) {
    return `SINCE ${timeRange.duration / MINUTE} MINUTES AGO`;
  } else if (timeRange.duration <= DAY) {
    return `SINCE ${timeRange.duration / HOUR} HOURS AGO`;
  } else {
    return `SINCE ${timeRange.duration / DAY} DAYS AGO`;
  }
};

export const fetchNetworkPathSummary = async (since, accountId) => {
  const nrql = `FROM InfrastructureEvent SELECT average(avgLatencyMs) as 'avg_latency', average(avgJitterMs) as 'avg_jitter', average(totalHops) as 'avg_hop_count', percentage(count(error), where error is not null) as 'error_percentage', average(packetLossPercent) as 'packet_loss_percent', uniqueCount(hostname) as 'num_locations', latest(traceCompleted) as 'last_trace_completed' where summary = 'NetworkPathSample' facet targetHost as 'target' ${since} LIMIT 500`;

  const gql = `
    {
        actor {
          summary: nrql(accounts: [${accountId}], query: "${nrql}", timeout: 90) {results}
        }
    }`;

  const response = await NerdGraphQuery.query({ query: gql });

  if (response.errors) {
    console.error('Error fetching network path summary:', response.errors);
    return null;
  }

  const result = response?.data?.actor?.summary?.results;

  return result;
};

export const fetchSourceHosts = async (since, accountId, targetHost) => {
  const nrql = `FROM InfrastructureEvent SELECT uniques(hostname) as 'hosts' where summary = 'NetworkPathSample' and targetHost = '${targetHost}' ${since}`;

  const gql = `
    {
        actor {
          hosts: nrql(accounts: [${accountId}], query: "${nrql}", timeout: 90) {results}
        }
    }`;

  const response = await NerdGraphQuery.query({ query: gql });

  if (response.errors) {
    console.error('Error fetching source hosts:', response.errors);
    return null;
  }

  const result = response?.data?.actor?.hosts?.results[0]?.hosts;

  return result;
};

export const fetchSummaryForTarget = async (since, accountId, targetHost) => {
  const summaryNrql = `FROM InfrastructureEvent SELECT uniqueCount(pathHash) as 'unique_paths', uniqueCount(hostname) as 'unique_hosts', uniques(protocol) as 'protocols' where summary = 'NetworkPathSample' and targetHost = '${targetHost}' ${since}`;
  const gql = `
    {
        actor {
          metadata: nrql(accounts: [${accountId}], query: "${summaryNrql}", timeout: 90) {results}
        }
    }`;

  const response = await NerdGraphQuery.query({ query: gql });

  if (response.errors) {
    console.error(
      'Error fetching summary metadata for target',
      response.errors
    );
    return null;
  }

  const result = response?.data?.actor?.metadata?.results[0];
  return result;
};

export const fetchTracesForTarget = async (
  since,
  accountId,
  targetHost,
  filters
) => {
  const traceNrql = `FROM InfrastructureEvent SELECT latest(timestamp) as 'timestamp', latest(hostname) as 'source_host', latest(sourceIp) as 'source_ip', latest(avgLatencyMs) as 'avg_latency', latest(minLatencyMs) as 'min_latency', latest(maxLatencyMs) as 'max_latency',  latest(avgJitterMs) as 'avg_jitter', latest(minJitterMs) as 'min_jitter', latest(maxJitterMs) as 'max_jitter', latest(reachableHops) as 'reachable_hops', latest(totalHops) as 'hop_count', percentage(count(error), where error is not null) as 'error_percentage', latest(packetLossPercent) as 'packet_loss_percent', latest(traceCompleted) as 'last_trace_completed', latest(error) as 'trace_error' where ${
    filters !== '' ? `${filters} and` : ''
  } summary = 'NetworkPathSample' and targetHost = '${targetHost}' facet traceId ${since} LIMIT 1000`;

  const gql = `
    {
        actor {
          traces: nrql(accounts: [${accountId}], query: "${traceNrql}", timeout: 90) {results}
        }
    }`;

  const response = await NerdGraphQuery.query({ query: gql });

  if (response.errors) {
    console.error('Error fetching traces for target:', response.errors);
    return null;
  }

  const result = response?.data?.actor?.traces?.results;
  return result;
};

export const fetchHopDetailsForTrace = async (
  since,
  accountId,
  traceId,
  targetHost
) => {
  const hopNrql = `FROM InfrastructureEvent SELECT latest(hopIp) as 'hop_ip', latest(hopIsPrivate) as 'hop_is_private', latest(hopAsn) as 'hop_asn', latest(hopAsName) as 'hop_asn_name', latest(hopLat) as 'hop_lat', latest(hopLon) as 'hop_lon', latest(hopCity) as 'hop_city', latest(hopRegion) as 'hop_region', latest(hopCountryCode) as 'hop_country_code', latest(isDestination) as 'hop_is_target', latest(isTimeout) as 'hop_is_timeout', latest(packetLossPercent) as 'hop_packet_loss', latest(avgLatencyMs) as 'avg_hop_latency', latest(minLatencyMs) as 'min_hop_latency', latest(maxLatencyMs) as 'max_hop_latency', latest(avgJitterMs) as 'avg_hop_jitter', latest(minJitterMs) as 'min_hop_jitter', latest(maxJitterMs) as 'max_hop_jitter'  where summary = 'NetworkPathHopSample' and targetHost = '${targetHost}' and traceId = '${traceId}' facet hopNumber ${since} LIMIT 250`;

  const gql = `
    {
        actor {
          hops: nrql(accounts: [${accountId}], query: "${hopNrql}", timeout: 90) {results}
        }
    }`;

  const response = await NerdGraphQuery.query({ query: gql });

  if (response.errors) {
    console.error('Error fetchiing hops for trace', response.errors);
    return null;
  }

  const result = response?.data?.actor?.hops?.results;
  return result;
};

export const getFilterKeys = async (accountId) => {
  const keysetQ = `FROM InfrastructureEvent SELECT keyset() where summary = 'NetworkPathSample' since 2 weeks ago`;

  const gql = `
  {
    actor {
      filterKeys: nrql(accounts: [${accountId}], query: "${keysetQ}", timeout: 90) {results}
    }
  }`;

  let data = await NerdGraphQuery.query({
    query: gql,
  });

  const result = data?.data?.actor?.filterKeys.results;

  const filteredKeys = result.filter((item) => {
    if (item.key) {
      return !FILTER_EXCLUSION_LIST.includes(item.key);
    }
    return true;
  });

  const formattedTags = filteredKeys.map((item) => {
    item.option = item.key;
    item.values = [];
    delete item.key;
    return item;
  });

  return formattedTags;
};

export const getFilterValues = async (key, accountId) => {
  const valuesQ = `FROM InfrastructureEvent SELECT uniques(${key}) as 'values' where summary = 'NetworkPathSample' since 2 weeks ago`;

  const gql = `
  {
    actor {
      filterValues: nrql(accounts: [${accountId}], query: "${valuesQ}", timeout: 90) {results}
    }
  }`;

  let data = await NerdGraphQuery.query({
    query: gql,
  });

  const keyValues = data?.data?.actor?.filterValues?.results[0]?.values;
  const formattedValues = keyValues.map((v) => ({ value: v }));

  return formattedValues;
};

export const filtersArrayToNrql = (filters = []) =>
  filters
    .map((filter, i) => {
      const lastIndex = filters.length - 1;
      const conjunction =
        i === lastIndex ? '' : filter.conjunction?.value || '';
      if (!conjunction && i < lastIndex) return '';
      const key = filter.key?.value;
      if (!key) return '';
      const {
        value: operator,
        multiValue,
        noValueNeeded,
        partialMatches,
      } = filter.operator || {};
      if (!operator) return '';
      let valueStr = '';
      if (multiValue && Array.isArray(filter.values)) {
        const valuesArr = filter.values
          ?.map(({ value } = {}) => (value?.trim?.() ? `'${value}'` : ''))
          .filter(Boolean);
        valueStr = valuesArr.length ? `(${valuesArr.join(', ')})` : '';
      } else if (filter?.values?.value?.trim?.()) {
        if (partialMatches) {
          valueStr = `'%${filter.values.value}%'`;
        } else if (operator === 'STARTS WITH') {
          valueStr = `'${filter.values.value}%'`;
        } else if (operator === 'ENDS WITH') {
          valueStr = `'%${filter.values.value}'`;
        } else {
          valueStr = `'${filter.values.value}'`;
        }
      }
      if (!valueStr && !noValueNeeded) return '';
      return `${key} ${
        operator === 'STARTS WITH' || operator === 'ENDS WITH'
          ? 'LIKE'
          : operator
      } ${valueStr} ${conjunction}`;
    })
    .join(' ');
