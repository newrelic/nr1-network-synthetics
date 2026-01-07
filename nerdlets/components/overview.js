import React, { useContext, useEffect, useState } from 'react';
import {
  EmptyState,
  PlatformStateContext,
  Spinner,
  DataTable,
  DataTableHeader,
  DataTableActionsHeaderCell,
  DataTableHeaderCell,
  DataTableBody,
  DataTableRow,
  DataTableRowCell,
  DataTableMetricRowCell,
  DataTableActionsRowCell,
  Icon,
  Tooltip,
} from 'nr1';

import TracesList from '../components/traces-list';
import HostList from '../components/host-list';

import { SUMMARY_TABLE_COLUMNS, TOOLTIPS } from '../shared/constants';
import { timeRangeToNrql, fetchNetworkPathSummary } from '../shared/utils';

const Overview = ({ selectedAccount }) => {
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [viewMode, setViewMode] = useState('overview');
  const { timeRange } = useContext(PlatformStateContext);

  const actions = [
    {
      label: 'View Traces',
      onClick: (evt, { item }) => {
        _openTracesList(item.facet);
      },
    },
    {
      label: 'View Hosts',
      onClick: (evt, { item }) => {
        _openHostsModal(item.facet);
      },
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const since = timeRangeToNrql(timeRange);
      const data = await fetchNetworkPathSummary(since, selectedAccount.id);
      await setTableData(data || []);
      setLoading(false);
    };

    if (selectedAccount) fetchData();
  }, [timeRange, selectedAccount]);

  const _openTracesList = (target) => {
    setSelectedTarget(target);
    setViewMode('traces');
  };

  const _openHostsModal = (target) => {
    setSelectedTarget(target);
  };

  if (!selectedAccount) {
    return (
      <EmptyState
        iconType={
          EmptyState.ICON_TYPE
            .HARDWARE_AND_SOFTWARE__HARDWARE__NETWORK__A_INSPECT
        }
        title="No Account Selected"
        description="Please select an account to view network path data."
      />
    );
  }

  if (loading) return <Spinner />;

  if (viewMode === 'traces') {
    return (
      <TracesList
        selectedTarget={selectedTarget}
        selectedAccount={selectedAccount}
        onBack={() => {
          setViewMode('overview');
          setSelectedTarget(null);
        }}
      />
    );
  }

  return (
    <>
      <HostList
        selectedTarget={selectedTarget}
        selectedAccount={selectedAccount}
        onClose={() => setSelectedTarget(null)}
      />
      <div>
        <DataTable ariaLabel="Targets" items={tableData}>
          <DataTableHeader>
            {SUMMARY_TABLE_COLUMNS.map((col, index) => (
              <DataTableHeaderCell name={col.id} value={col.id} key={index}>
                <Tooltip
                  text={TOOLTIPS.OVERVIEW[col.id] || ''}
                  placementType={Tooltip.PLACEMENT_TYPE.LEFT}
                >
                  <Icon
                    style={{ marginRight: '4px' }}
                    type={Icon.TYPE.INTERFACE__INFO__HELP}
                  />
                </Tooltip>
                {col.name}
              </DataTableHeaderCell>
            ))}
            <DataTableActionsHeaderCell />
          </DataTableHeader>
          <DataTableBody>
            {({ item }) => (
              <DataTableRow>
                <DataTableRowCell>{() => item.facet}</DataTableRowCell>
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
                <DataTableRowCell>
                  {() =>
                    item.avg_hop_count !== null
                      ? item.avg_hop_count.toFixed(0)
                      : 'No data'
                  }
                </DataTableRowCell>
                <DataTableMetricRowCell>
                  {(value) => (value !== null ? `${value.toFixed(2)}%` : `0%`)}
                </DataTableMetricRowCell>
                <DataTableMetricRowCell>
                  {(value) =>
                    value !== null ? `${value.toFixed(2)}%` : 'No data'
                  }
                </DataTableMetricRowCell>
                <DataTableRowCell>{() => item.num_locations}</DataTableRowCell>
                <DataTableRowCell>
                  {() => (item.last_trace_completed === 1 ? 'Yes' : 'No')}
                </DataTableRowCell>
                <DataTableActionsRowCell actions={actions} />
              </DataTableRow>
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </>
  );
};

export default Overview;
