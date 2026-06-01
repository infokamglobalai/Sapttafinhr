import ProductPageShell from '../components/marketing/ProductPageShell';
import { hrmsPage } from '../data/product-pages-data';

export default function HrmsSolutions() {
  return <ProductPageShell config={hrmsPage} currentPath="/hrms" />;
}
