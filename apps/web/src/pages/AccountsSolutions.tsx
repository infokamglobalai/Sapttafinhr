import ProductPageShell from '../components/marketing/ProductPageShell';
import { accountsPage } from '../data/product-pages-data';

export default function AccountsSolutions() {
  return <ProductPageShell config={accountsPage} currentPath="/accounts" />;
}
