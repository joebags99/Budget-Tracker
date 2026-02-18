import DataManagement from './DataManagement.jsx';
import TaxExport      from './TaxExport.jsx';
import CoOwnerReport  from './CoOwnerReport.jsx';

export default function Reports() {
  return (
    <div className="tab-content">
      <DataManagement />
      <TaxExport />
      <CoOwnerReport />
    </div>
  );
}
