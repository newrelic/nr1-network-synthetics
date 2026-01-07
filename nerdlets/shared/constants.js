export const SUMMARY_TABLE_COLUMNS = [
  { id: 'facet', name: 'Target Host' },
  { id: 'avg_latency', name: 'Avg Latency' },
  { id: 'avg_jitter', name: 'Avg Jitter' },
  { id: 'avg_hop_count', name: 'Avg Hop Count' },
  { id: 'error_percentage', name: 'Error %' },
  { id: 'packet_loss_percent', name: 'Packet Loss %' },
  { id: 'num_locations', name: 'Host Count' },
  { id: 'last_trace_completed', name: 'Last Trace Success' },
];

export const TRACES_TABLE_COLUMNS = [
  { id: 'timestamp', name: 'Timestamp' },
  { id: 'traceId', name: 'Trace ID' },
  { id: 'source_host', name: 'Source Host' },
  { id: 'source_ip', name: 'Source IP' },
  { id: 'avg_latency', name: 'Avg Latency' },
  { id: 'min_latency', name: 'Min Latency' },
  { id: 'max_latency', name: 'Max Latency' },
  { id: 'avg_jitter', name: 'Avg Jitter' },
  { id: 'min_jitter', name: 'Min Jitter' },
  { id: 'max_jitter', name: 'Max Jitter' },
  { id: 'hop_count', name: 'Hop Count' },
  { id: 'reachable_hops', name: 'Reachable Hops' },
  { id: 'packet_loss_percent', name: 'Packet Loss %' },
  { id: 'last_trace_completed', name: 'Success' },
  { id: 'trace_error', name: 'Error' },
];

export const FILTER_EXCLUSION_LIST = [
  'entityGuid',
  'entityName',
  'entityId',
  'entityKey',
  'coreCount',
  'agentName',
  'agentVersion',
  'instanceType',
  'kernelVersion',
  'linuxDistribution',
  'operatingSystem',
  'processorCount',
  'avgJitterMs',
  'avgLatencyMs',
  'maxJitterMs',
  'maxLatencyMs',
  'minJitterMs',
  'minLatencyMs',
  'packetLossPercent',
  'reachableHops',
  'totalHops',
  'traceCompleted',
  'traceDurationMs',
  'timestamp',
];

export const TOOLTIPS = {
  OVERVIEW: {
    facet: 'The destination host for the network path traces.',
    avg_latency:
      'The average latency in milliseconds for traces to this target host.',
    avg_jitter:
      'The average jitter in milliseconds for traces to this target host.',
    avg_hop_count: 'The average number of hops for traces to this target host.',
    error_percentage:
      'The percentage of traces to this target host that encountered errors.',
    packet_loss_percent:
      'The average packet loss percentage for traces to this target host.',
    num_locations:
      'The number of unique source hosts that have traced to this target host.',
    last_trace_completed:
      'Indicates whether the most recent trace to this target host was completed successfully.',
  },
  FILTER:
    'Select the + button to apply filters to the data displayed for the selected target.',
};
