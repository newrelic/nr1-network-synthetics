import React, { useEffect, useState } from 'react';
import {
  AccountsQuery,
  Dropdown,
  DropdownItem,
  EmptyState,
  Spinner,
} from 'nr1';
import Overview from '../components/overview';

const RootNerdlet = () => {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      const { data, error } = await AccountsQuery.query();
      if (error) {
        console.error('Error fetching accounts:', error);
        setLoading(false);
        return;
      }

      setAccounts(data);
      setFilteredAccounts(data);
      setLoading(false);
    };

    fetchAccounts();
  }, []);

  const onSearch = (event) => {
    const { value } = event.target;

    setSearch(value);

    setFilteredAccounts(
      accounts.filter((account) =>
        account.name.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  if (loading) {
    return <Spinner />;
  }

  if (!loading && accounts.length === 0) {
    return (
      <EmptyState
        iconType={
          EmptyState.ICON_TYPE
            .HARDWARE_AND_SOFTWARE__SOFTWARE__DATABASE__S_WARNING
        }
        title="No accounts found"
        description="Check browser console for errors"
      />
    );
  }

  return (
    <>
      <Dropdown
        title={selectedAccount ? selectedAccount.name : 'Select Account'}
        label="Account"
        labelInline
        items={accounts}
        search={search}
        onSearch={onSearch}
        className="account-dropdown"
      >
        {filteredAccounts.map((account) => (
          <DropdownItem
            key={account.id}
            onClick={() => setSelectedAccount(account)}
            selected={selectedAccount?.id === account.id}
          >
            {account.name}
          </DropdownItem>
        ))}
      </Dropdown>
      <Overview selectedAccount={selectedAccount} />
    </>
  );
};

export default RootNerdlet;
