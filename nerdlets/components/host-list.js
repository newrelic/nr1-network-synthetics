import React, { useContext, useEffect, useState } from 'react';

import {
  DataTable,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableBody,
  DataTableRow,
  DataTableRowCell,
  HeadingText,
  Modal,
  PlatformStateContext,
  Spinner,
} from 'nr1';
import { fetchSourceHosts, timeRangeToNrql } from '../shared/utils';

const HostList = ({ selectedTarget, selectedAccount, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [hosts, setHosts] = useState([]);
  const { timeRange } = useContext(PlatformStateContext);

  useEffect(() => {
    const fetchHosts = async () => {
      setLoading(true);
      const since = timeRangeToNrql(timeRange);
      const data = await fetchSourceHosts(
        since,
        selectedAccount.id,
        selectedTarget
      );
      setHosts(data || []);
      setLoading(false);
    };

    if (selectedTarget && selectedAccount) {
      fetchHosts();
    }
  }, [selectedTarget, selectedAccount, timeRange]);

  return (
    <Modal hidden={selectedTarget === null} onClose={onClose}>
      <HeadingText type={HeadingText.TYPE.HEADING_2}>
        Hosts tracing to {selectedTarget}
      </HeadingText>
      {loading ? (
        <Spinner />
      ) : (
        <DataTable ariaLabel="Hosts" items={hosts}>
          <DataTableHeader>
            <DataTableHeaderCell name="name" value="name">
              Name
            </DataTableHeaderCell>
          </DataTableHeader>
          <DataTableBody>
            {({ item }) => (
              <DataTableRow>
                <DataTableRowCell>{() => item}</DataTableRowCell>
              </DataTableRow>
            )}
          </DataTableBody>
        </DataTable>
      )}
    </Modal>
  );
};

export default HostList;
