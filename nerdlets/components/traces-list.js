import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  Button,
  DataTable,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableBody,
  DataTableRow,
  DataTableRowCell,
  DataTableMetricRowCell,
  Icon,
  PlatformStateContext,
  Spinner,
  Tooltip,
} from 'nr1';
import {
  fetchTracesForTarget,
  filtersArrayToNrql,
  timeRangeToNrql,
} from '../shared/utils';
import { TRACES_TABLE_COLUMNS, TOOLTIPS } from '../shared/constants';

import Header from './header';
import Filter from '../shared/filter';
import TraceDrilldown from './trace-drilldown';

//TODO: add success/fail color outline to rows based on error/success result

const TracesList = ({ selectedTarget, selectedAccount, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [traces, setTraces] = useState([]);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [selectedTraceError, setSelectedTraceError] = useState(null);
  const [currentFilterSelections, setCurrentFilterSelections] = useState([]);
  const [appliedFilterSelections, setAppliedFilterSelections] = useState([]);
  const { timeRange } = useContext(PlatformStateContext);
  const hops = useRef(null);

  useEffect(() => {
    const fetchTraces = async () => {
      setLoading(true);
      const since = timeRangeToNrql(timeRange);
      const filterClause =
        appliedFilterSelections &&
        appliedFilterSelections !== '' &&
        appliedFilterSelections.length !== 0
          ? filtersArrayToNrql(appliedFilterSelections)
          : '';
      const data = await fetchTracesForTarget(
        since,
        selectedAccount.id,
        selectedTarget,
        filterClause
      );
      setTraces(data || []);
      setLoading(false);
    };
    if (selectedTarget && selectedAccount) {
      fetchTraces();
    }
  }, [timeRange, selectedAccount, selectedTarget, appliedFilterSelections]);

  const filtersHaveChanged = useMemo(() => {
    return (
      JSON.stringify(currentFilterSelections) !==
      JSON.stringify(appliedFilterSelections)
    );
  }, [currentFilterSelections, appliedFilterSelections]);

  if (loading) {
    return <Spinner />;
  }

  const handleApplyFilters = () => {
    setAppliedFilterSelections(currentFilterSelections);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <Header
        view="traces-list"
        selectedAccount={selectedAccount}
        selectedTarget={selectedTarget}
        onBack={onBack}
      />
      <Filter
        account={selectedAccount.id}
        selections={currentFilterSelections}
        setSelections={setCurrentFilterSelections}
      />
      <div className="filter-button">
        <Button
          onClick={handleApplyFilters}
          disabled={!filtersHaveChanged}
          variant={Button.VARIANT.PRIMARY}
          sizeType={Button.SIZE_TYPE.SMALL}
        >
          Apply Filter
        </Button>
        <Tooltip
          text={TOOLTIPS.FILTER}
          placementType={Tooltip.PLACEMENT_TYPE.RIGHT}
        >
          <Icon
            className="filter-icon"
            type={Icon.TYPE.INTERFACE__INFO__HELP}
          />
        </Tooltip>
      </div>
      <div className="traces-table">
        <DataTable
          ariaLabel="Traces"
          densityType={DataTable.DENSITY_TYPE.COMPACT}
          items={traces}
          height={300}
        >
          <DataTableHeader>
            {TRACES_TABLE_COLUMNS.map((col, index) => {
              const columnSizes = {
                timestamp: '140px',
                traceId: '120px',
                source_host: '110px',
                source_ip: '100px',
                avg_latency: '95px',
                min_latency: '95px',
                max_latency: '95px',
                avg_jitter: '90px',
                min_jitter: '90px',
                max_jitter: '90px',
                hop_count: '60px',
                reachable_hops: '60px',
                packet_loss_percent: '90px',
                last_trace_completed: '70px',
                trace_error: '1fr',
              };

              return (
                <DataTableHeaderCell
                  name={col.id}
                  value={col.id}
                  key={index}
                  initialSize={columnSizes[col.id]}
                >
                  {col.name}
                </DataTableHeaderCell>
              );
            })}
          </DataTableHeader>
          <DataTableBody>
            {({ item }) => {
              const formatTimestamp = (ts) => {
                return ts ? new Date(ts).toLocaleString() : 'N/A';
              };

              return (
                <DataTableRow
                  onClick={() => {
                    setSelectedTrace(item.traceId);
                    setSelectedTraceError(item.trace_error);
                  }}
                >
                  <DataTableRowCell>
                    {() => formatTimestamp(item.timestamp)}
                  </DataTableRowCell>
                  <DataTableRowCell>{() => item.traceId}</DataTableRowCell>
                  <DataTableRowCell>{() => item.source_host}</DataTableRowCell>
                  <DataTableRowCell>{() => item.source_ip}</DataTableRowCell>
                  <DataTableMetricRowCell>
                    {(value) =>
                      value !== null ? `${value.toFixed(2)} ms` : 'No data'
                    }
                  </DataTableMetricRowCell>
                  <DataTableMetricRowCell>
                    {(value) =>
                      value !== null ? `${value.toFixed(2)} ms` : 'No data'
                    }
                  </DataTableMetricRowCell>
                  <DataTableMetricRowCell>
                    {(value) =>
                      value !== null ? `${value.toFixed(2)} ms` : 'No data'
                    }
                  </DataTableMetricRowCell>
                  <DataTableMetricRowCell>
                    {(value) =>
                      value !== null ? `${value.toFixed(2)} ms` : 'No data'
                    }
                  </DataTableMetricRowCell>
                  <DataTableMetricRowCell>
                    {(value) =>
                      value !== null ? `${value.toFixed(2)} ms` : 'No data'
                    }
                  </DataTableMetricRowCell>
                  <DataTableMetricRowCell>
                    {(value) =>
                      value !== null ? `${value.toFixed(2)} ms` : 'No data'
                    }
                  </DataTableMetricRowCell>
                  <DataTableRowCell>{() => item.hop_count}</DataTableRowCell>
                  <DataTableRowCell>
                    {() => item.reachable_hops}
                  </DataTableRowCell>
                  <DataTableMetricRowCell>
                    {(value) =>
                      value !== null ? `${value.toFixed(2)}%` : 'No data'
                    }
                  </DataTableMetricRowCell>
                  <DataTableRowCell>
                    {() => (item.last_trace_completed === 1 ? 'Yes' : 'No')}
                  </DataTableRowCell>
                  <DataTableRowCell>
                    {() => {
                      const errorText = item.trace_error || 'None';
                      return (
                        <Tooltip text={errorText}>
                          <div className="text-ellipsis">{errorText}</div>
                        </Tooltip>
                      );
                    }}
                  </DataTableRowCell>
                </DataTableRow>
              );
            }}
          </DataTableBody>
        </DataTable>
      </div>
      <TraceDrilldown
        selectedTrace={selectedTrace}
        targetHost={selectedTarget}
        selectedAccount={selectedAccount}
        traceError={selectedTraceError}
        filters={appliedFilterSelections}
        mapRef={hops}
      />
    </div>
  );
};

export default TracesList;
