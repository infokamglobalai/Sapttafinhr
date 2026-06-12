import ProductPageShell from '../components/marketing/ProductPageShell';
import { mobileAppPage } from '../data/product-pages-data';

export default function MobileApp() {
  return <ProductPageShell config={mobileAppPage} currentPath="/mobile-app" />;
}
