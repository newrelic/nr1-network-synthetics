import React, { useContext, useEffect, useState } from 'react';
import { Button, Card, HeadingText, PlatformStateContext, Spinner } from 'nr1';
import { fetchSummaryForTarget, timeRangeToNrql } from '../shared/utils';

const Header = ({ view, selectedAccount, selectedTarget, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const { timeRange } = useContext(PlatformStateContext);

  useEffect(() => {
    const fetchData = async (view) => {
      setLoading(true);
      const since = timeRangeToNrql(timeRange);
      if (view === 'traces-list') {
        const data = await fetchSummaryForTarget(
          since,
          selectedAccount.id,
          selectedTarget
        );
        setData(data || {});
      } else {
        return;
      }
      setLoading(false);
    };
    fetchData(view);
  }, [view, timeRange, selectedAccount, selectedTarget]);

  if (loading) return <Spinner />;

  return (
    <Card className="header-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <HeadingText type={HeadingText.TYPE.HEADING_1}>
            {`Target: ${selectedTarget}`}
          </HeadingText>
          {view === 'traces-list' && data && (
            <div style={{ marginTop: '8px', fontSize: '14px' }}>
              <span>
                Protocols: {data.protocols ? data.protocols.join(', ') : 'N/A'}
              </span>
              <span style={{ margin: '0 8px' }}>|</span>
              <span>Unique Hosts: {data.unique_hosts || 0}</span>
              <span style={{ margin: '0 8px' }}>|</span>
              <span>Unique Paths: {data.unique_paths || 0}</span>
            </div>
          )}
        </div>
        {onBack && <Button onClick={onBack}>Back to Overview</Button>}
      </div>
    </Card>
  );
};

export default Header;
