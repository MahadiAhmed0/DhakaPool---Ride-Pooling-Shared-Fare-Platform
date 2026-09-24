// The passenger's TeslaPay wallet: balance, top-up and statement (FR-PAY-01, FR-PAY-02).
import { WalletBalance } from './wallet-balance';
import { WalletStatementList } from './wallet-statement';

export default function WalletPage() {
  return (
    <>
      <WalletBalance />
      <WalletStatementList />
    </>
  );
}
