import { theme as antTheme } from 'antd';
import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  algorithm: antTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#FF6D00',
    colorSuccess: '#10B981',
    colorWarning: '#FF9800',
    colorLink: '#FF6D00',
    colorLinkHover: '#FF9100',
    colorBgBase: '#FAFAFC',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBorder: '#EAECEF',
    colorBorderSecondary: '#F1F3F5',
    colorText: '#0A1128',
    colorTextSecondary: 'rgba(10, 17, 40, 0.65)',
    colorTextTertiary: 'rgba(10, 17, 40, 0.45)',
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 15,
    boxShadow: '0 4px 32px rgba(10, 17, 40, 0.05)',
    boxShadowSecondary: '0 2px 16px rgba(10, 17, 40, 0.03)',
  },
  components: {
    Button: {
      colorPrimary: '#FF6D00',
      colorPrimaryHover: '#FF8F00',
      colorPrimaryActive: '#E65100',
      algorithm: true,
    },
    Menu: {
      colorBgContainer: 'transparent',
      itemColor: '#0A1128',
      itemHoverColor: '#FF6D00',
      itemSelectedColor: '#FF6D00',
      itemSelectedBg: 'rgba(255, 109, 0, 0.08)',
      horizontalItemSelectedColor: '#FF6D00',
    },
    Card: {
      colorBgContainer: '#FFFFFF',
      colorBorder: '#EAECEF',
      boxShadowTertiary: '0 4px 24px rgba(10, 17, 40, 0.04)',
    },
    Table: {
      colorBgContainer: '#FFFFFF',
      headerBg: '#FAFAFC',
      headerColor: '#0A1128',
      borderColor: '#EAECEF',
      rowHoverBg: '#F8F9FA',
    },
    Input: {
      colorBgContainer: '#FFFFFF',
      colorBorder: '#EAECEF',
      colorText: '#0A1128',
      colorTextPlaceholder: 'rgba(10, 17, 40, 0.35)',
      activeBorderColor: '#FF6D00',
      hoverBorderColor: '#FF6D00',
    },
    Select: {
      colorBgContainer: '#FFFFFF',
      colorBorder: '#EAECEF',
      colorText: '#0A1128',
      optionSelectedBg: 'rgba(255, 109, 0, 0.08)',
    },
    Form: {
      labelColor: '#0A1128',
    },
    Divider: {
      colorSplit: '#EAECEF',
    },
    Tag: {
      colorBgContainer: 'transparent',
    },
    Drawer: {
      colorBgElevated: '#FAFAFC',
    },
    Modal: {
      contentBg: '#FFFFFF',
      headerBg: '#FFFFFF',
    },
  },
};

export default theme;
