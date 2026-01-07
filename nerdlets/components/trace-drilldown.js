import React, { useContext, useEffect, useState } from 'react';
import { LineChart, HeadingText, PlatformStateContext } from 'nr1';
import TraceMap from './trace-map';
import { filtersArrayToNrql, timeRangeToNrql } from '../shared/utils';

const TraceDrilldown = ({
  selectedTrace,
  targetHost,
  selectedAccount,
  filters,
  traceError,
  mapRef,
}) => {
  const { timeRange } = useContext(PlatformStateContext);
  const filterClause =
    filters && filters !== '' ? filtersArrayToNrql(filters) : '';
  const [timeWindow, setTimeWindow] = useState('since 30 minutes ago');

  useEffect(() => {
    const since = timeRangeToNrql(timeRange);
    setTimeWindow(since);
  }, [timeRange]);

  return (
    <div>
      <div className="chart-row">
        <div className="chart-container">
          <HeadingText
            type={HeadingText.TYPE.HEADING_4}
            className="section-title"
          >
            Average Latency (ms)
          </HeadingText>
          <div className="chart-content">
            <LineChart
              accountId={selectedAccount.id}
              query={`FROM InfrastructureEvent SELECT latest(avgLatencyMs) as 'avg_latency' where ${
                filterClause !== '' ? `${filterClause} and` : ''
              } summary = 'NetworkPathSample' and targetHost = '${targetHost}' facet sourceIp ${timeWindow} TIMESERIES AUTO`}
              fullWidth
              fullHeight
            />
          </div>
        </div>
        <div className="chart-container">
          <HeadingText
            type={HeadingText.TYPE.HEADING_4}
            className="section-title"
          >
            Average Jitter (ms)
          </HeadingText>
          <div className="chart-content">
            <LineChart
              accountId={selectedAccount.id}
              query={`FROM InfrastructureEvent SELECT latest(avgJitterMs) as 'avg_jitter' where ${
                filterClause !== '' ? `${filterClause} and` : ''
              } summary = 'NetworkPathSample' and targetHost = '${targetHost}' facet sourceIp ${timeWindow} TIMESERIES AUTO`}
              fullWidth
              fullHeight
            />
          </div>
        </div>
      </div>
      <div className="chart-row-last">
        <div className="chart-container">
          <HeadingText
            type={HeadingText.TYPE.HEADING_4}
            className="section-title"
          >
            Packet Loss (%)
          </HeadingText>
          <div className="chart-content">
            <LineChart
              accountId={selectedAccount.id}
              query={`FROM InfrastructureEvent SELECT latest(packetLossPercent) as 'packet_loss_percent' where ${
                filterClause !== '' ? `${filterClause} and` : ''
              } summary = 'NetworkPathSample' and targetHost = '${targetHost}' facet sourceIp ${timeWindow} TIMESERIES AUTO`}
              fullWidth
              fullHeight
            />
          </div>
        </div>
        <div className="chart-container">
          <HeadingText
            type={HeadingText.TYPE.HEADING_4}
            className="section-title"
          >
            Total Hops
          </HeadingText>
          <div className="chart-content">
            <LineChart
              accountId={selectedAccount.id}
              query={`FROM InfrastructureEvent SELECT latest(totalHops) as 'total_hops' where ${
                filterClause !== '' ? `${filterClause} and` : ''
              } summary = 'NetworkPathSample' and targetHost = '${targetHost}' facet sourceIp ${timeWindow} TIMESERIES AUTO`}
              fullWidth
              fullHeight
            />
          </div>
        </div>
      </div>
      <div>
        {selectedTrace && (
          <TraceMap
            selectedTrace={selectedTrace}
            targetHost={targetHost}
            selectedAccount={selectedAccount}
            traceError={traceError}
            mapRef={mapRef}
          />
        )}
      </div>
    </div>
  );
};

export default TraceDrilldown;
